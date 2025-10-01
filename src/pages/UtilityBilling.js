import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  IconButton,
  Tooltip} from '@mui/material';
import { Calculate, Save, Download, PictureAsPdf, Edit } from '@mui/icons-material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function UtilityBilling() {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [units, setUnits] = useState([]);
  const [billingData, setBillingData] = useState([]);
  const [existingBills, setExistingBills] = useState([]);
  const [rate, setRate] = useState('');
  const [billingMonth, setBillingMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);

  // Set default billing month to current month
  useEffect(() => {
    const now = new Date();
    const month = now.toISOString().slice(0, 7);
    setBillingMonth(month);
  }, []);

  // Fetch properties
  useEffect(() => {
    fetchProperties();
  }, []);

  // Fetch units and check for existing bills when property and month are selected
  useEffect(() => {
    if (selectedProperty && billingMonth) {
      fetchUnitsAndBills();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProperty, billingMonth]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setError('Error loading properties');
    }
  };

  const fetchUnitsAndBills = async () => {
    try {
      setLoading(true);
      
      // Fetch units for the selected property
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select(`
          id,
          unit_number,
          tenants (
            id,
            name
          )
        `)
        .eq('property_id', selectedProperty)
        .order('unit_number');
      
      if (unitsError) throw unitsError;
      setUnits(unitsData || []);

      // Check for existing bills
      const formattedMonth = formatBillingMonth(billingMonth);
      const unitIds = unitsData?.map(unit => unit.id) || [];
      
      if (unitIds.length > 0) {
        const { data: billsData, error: billsError } = await supabase
          .from('utility_bills')
          .select(`
            *,
            units (
              unit_number,
              tenants (
                name
              )
            )
          `)
          .eq('billing_month', formattedMonth)
          .in('unit_id', unitIds);

        if (billsError) throw billsError;

        if (billsData && billsData.length > 0) {
          setExistingBills(billsData);
          setEditMode(true);
          // Load existing bills into billing data for editing
          const billsWithUnitInfo = billsData.map(bill => ({
            unit_id: bill.unit_id,
            unit_number: bill.units.unit_number,
            tenant_name: bill.units.tenants?.[0]?.name || 'Vacant',
            arrears_bf: bill.arrears_bf,
            previous_reading: bill.previous_reading,
            current_reading: bill.current_reading,
            units_consumed: bill.units_consumed,
            rate: bill.rate,
            total_amount: bill.total_amount,
            bill_id: bill.id
          }));
          setBillingData(billsWithUnitInfo);
          setRate(billsData[0].rate.toString());
        } else {
          setExistingBills([]);
          setEditMode(false);
          // Initialize empty billing data for new bills
          const emptyBillingData = await Promise.all(
            unitsData.map(async (unit) => ({
              unit_id: unit.id,
              unit_number: unit.unit_number,
              tenant_name: unit.tenants?.[0]?.name || 'Vacant',
              arrears_bf: 0,
              previous_reading: await getPreviousReading(unit.id),
              current_reading: '',
              units_consumed: 0,
              rate: rate || '',
              total_amount: 0
            }))
          );
          setBillingData(emptyBillingData);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const getPreviousReading = async (unitId) => {
    try {
      const { data, error } = await supabase
        .from('utility_bills')
        .select('current_reading')
        .eq('unit_id', unitId)
        .order('billing_month', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return data?.[0]?.current_reading || 0;
    } catch (error) {
      console.error('Error fetching previous reading:', error);
      return 0;
    }
  };

  const handleCurrentReadingChange = (index, value) => {
    const newBillingData = [...billingData];
    const currentReading = parseFloat(value) || 0;
    const previousReading = parseFloat(newBillingData[index].previous_reading) || 0;
    
    newBillingData[index].current_reading = value;
    newBillingData[index].units_consumed = Math.max(0, currentReading - previousReading);
    
    if (rate) {
      newBillingData[index].rate = parseFloat(rate);
      newBillingData[index].total_amount = newBillingData[index].units_consumed * parseFloat(rate);
    }
    
    setBillingData(newBillingData);
  };

  const handleRateChange = (newRate) => {
    setRate(newRate);
    
    const newBillingData = billingData.map(item => ({
      ...item,
      rate: parseFloat(newRate) || 0,
      total_amount: item.units_consumed * (parseFloat(newRate) || 0)
    }));
    
    setBillingData(newBillingData);
  };

  const calculateAll = () => {
    if (!rate) {
      setError('Please set a rate first');
      return;
    }

    const newBillingData = billingData.map(item => ({
      ...item,
      rate: parseFloat(rate),
      total_amount: item.units_consumed * parseFloat(rate)
    }));

    setBillingData(newBillingData);
    setSuccess('All calculations completed');
  };

  const validateBillingData = () => {
    for (const item of billingData) {
      if (!item.current_reading && item.current_reading !== 0) {
        return `Please enter current reading for Unit ${item.unit_number}`;
      }
      if (parseFloat(item.current_reading) < parseFloat(item.previous_reading)) {
        return `Current reading cannot be less than previous reading for Unit ${item.unit_number}`;
      }
    }
    return null;
  };

  const formatBillingMonth = (monthString) => {
    return `${monthString}-01`;
  };

  const saveBills = async () => {
    const validationError = validateBillingData();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!billingMonth) {
      setError('Please select billing month');
      return;
    }

    if (!rate) {
      setError('Please set a rate first');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const formattedMonth = formatBillingMonth(billingMonth);
      
      if (editMode) {
        // Update existing bills - without updated_at column
        const updatePromises = billingData.map(async (item) => {
          const { error } = await supabase
            .from('utility_bills')
            .update({
              arrears_bf: parseFloat(item.arrears_bf) || 0,
              previous_reading: parseFloat(item.previous_reading) || 0,
              current_reading: parseFloat(item.current_reading) || 0,
              units_consumed: parseFloat(item.units_consumed) || 0,
              rate: parseFloat(rate) || 0,
              total_amount: parseFloat(item.total_amount) || 0
            })
            .eq('id', item.bill_id);

          if (error) throw error;
        });

        await Promise.all(updatePromises);
        setSuccess('Utility bills updated successfully!');
      } else {
        // Insert new bills
        const billsToInsert = billingData.map(item => ({
          unit_id: item.unit_id,
          billing_month: formattedMonth,
          arrears_bf: parseFloat(item.arrears_bf) || 0,
          previous_reading: parseFloat(item.previous_reading) || 0,
          current_reading: parseFloat(item.current_reading) || 0,
          units_consumed: parseFloat(item.units_consumed) || 0,
          rate: parseFloat(rate) || 0,
          total_amount: parseFloat(item.total_amount) || 0,
          created_at: new Date().toISOString()
        }));

        const { error } = await supabase
          .from('utility_bills')
          .insert(billsToInsert);

        if (error) throw error;
        setSuccess('Utility bills saved successfully!');
      }
      
    } catch (error) {
      console.error('Error saving bills:', error);
      if (error.code === '23505') {
        setError('Bills already exist for this month. The system should have automatically switched to edit mode.');
      } else {
        setError('Error saving utility bills: ' + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const switchToCreateMode = () => {
    setEditMode(false);
    setExistingBills([]);
    // Reset billing data for new entries
    const emptyBillingData = units.map(unit => ({
      unit_id: unit.id,
      unit_number: unit.unit_number,
      tenant_name: unit.tenants?.[0]?.name || 'Vacant',
      arrears_bf: 0,
      previous_reading: 0,
      current_reading: '',
      units_consumed: 0,
      rate: rate || '',
      total_amount: 0
    }));
    setBillingData(emptyBillingData);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  // PDF Download Function
  const downloadPDF = () => {
    if (billingData.length === 0) {
      setError('No billing data to download');
      return;
    }

    const doc = new jsPDF();
    const propertyName = properties.find(p => p.id === selectedProperty)?.name || 'Unknown Property';
    
    // Title
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text(`UTILITY BILLING STATEMENT - ${propertyName}`, 105, 15, { align: 'center' });
    
    // Billing Period
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Billing Period: ${formatDate(formatBillingMonth(billingMonth))}`, 105, 25, { align: 'center' });
    
    // Rate Information
    doc.text(`Rate: Ksh ${parseFloat(rate || 0).toFixed(2)} per unit`, 105, 32, { align: 'center' });
    
    // Generated Date
    doc.text(`Generated: ${new Date().toLocaleDateString('en-KE')}`, 105, 39, { align: 'center' });
    
    // Table data
    const tableData = billingData.map((item, index) => [
      index + 1,
      `Unit ${item.unit_number}`,
      item.tenant_name,
      formatCurrency(parseFloat(item.arrears_bf) || 0),
      (parseFloat(item.previous_reading) || 0).toFixed(2),
      (parseFloat(item.current_reading) || 0).toFixed(2),
      (parseFloat(item.units_consumed) || 0).toFixed(2),
      `Ksh ${(parseFloat(item.rate) || 0).toFixed(2)}`,
      formatCurrency(parseFloat(item.total_amount) || 0)
    ]);

    // Table columns
    const tableColumns = [
      '#',
      'Unit No.',
      'Tenant',
      'Arrears B/F',
      'Prev Reading',
      'Curr Reading',
      'Units Used',
      'Rate',
      'Total Amount'
    ];

    // Add table
    doc.autoTable({
      head: [tableColumns],
      body: tableData,
      startY: 45,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 20 },
        7: { cellWidth: 20 },
        8: { cellWidth: 25 }
      }
    });

    // Total summary
    const finalY = doc.lastAutoTable.finalY + 10;
    const totalUnits = billingData.reduce((sum, item) => sum + (parseFloat(item.units_consumed) || 0), 0);
    const totalAmount = billingData.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Units Consumed: ${totalUnits.toFixed(2)}`, 14, finalY);
    doc.text(`Total Amount: ${formatCurrency(totalAmount)}`, 14, finalY + 7);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by Estate Management System', 105, 280, { align: 'center' });

    // Save PDF
    doc.save(`utility-bills-${propertyName}-${billingMonth}.pdf`);
  };

  // Download individual bill as PDF
  const downloadIndividualBill = (billData) => {
    const doc = new jsPDF();
    const propertyName = properties.find(p => p.id === selectedProperty)?.name || 'Unknown Property';
    
    // Parse all numeric values to ensure they're numbers
    const arrearsBf = parseFloat(billData.arrears_bf) || 0;
    const previousReading = parseFloat(billData.previous_reading) || 0;
    const currentReading = parseFloat(billData.current_reading) || 0;
    const unitsConsumed = parseFloat(billData.units_consumed) || 0;
    const rateValue = parseFloat(billData.rate) || 0;
    const totalAmount = parseFloat(billData.total_amount) || 0;
    const totalDue = arrearsBf + totalAmount;
    
    // Title
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('UTILITY BILL', 105, 20, { align: 'center' });
    
    // Property and Unit Info
    doc.setFontSize(12);
    doc.text(`Property: ${propertyName}`, 20, 35);
    doc.text(`Unit: ${billData.unit_number}`, 20, 45);
    doc.text(`Tenant: ${billData.tenant_name}`, 20, 55);
    doc.text(`Billing Period: ${formatDate(formatBillingMonth(billingMonth))}`, 20, 65);
    
    // Bill Details
    doc.setFontSize(10);
    doc.text('BILL DETAILS:', 20, 80);
    
    const details = [
      ['Arrears Brought Forward:', formatCurrency(arrearsBf)],
      ['Previous Reading:', `${previousReading.toFixed(2)} units`],
      ['Current Reading:', `${currentReading.toFixed(2)} units`],
      ['Units Consumed:', `${unitsConsumed.toFixed(2)} units`],
      ['Rate:', `Ksh ${rateValue.toFixed(2)} per unit`],
      ['Current Charge:', formatCurrency(totalAmount)],
      ['Total Amount Due:', formatCurrency(totalDue)]
    ];

    let yPos = 90;
    details.forEach(([label, value]) => {
      doc.text(label, 25, yPos);
      doc.text(value, 120, yPos);
      yPos += 8;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Thank you for your business', 105, 260, { align: 'center' });
    doc.text('Generated by Estate Management System', 105, 265, { align: 'center' });

    doc.save(`utility-bill-unit-${billData.unit_number}-${billingMonth}.pdf`);
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mb: 4 }}>
        Utility Billing
      </Typography>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Mode Indicator */}
      {editMode && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Edit Mode:</strong> You are editing existing bills for {formatDate(formatBillingMonth(billingMonth))}. 
          Changes will update the existing records.
          <Button 
            color="inherit" 
            size="small" 
            onClick={switchToCreateMode}
            sx={{ ml: 2 }}
          >
            Create New Bills Instead
          </Button>
        </Alert>
      )}

      {/* Selection Card */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'medium', mb: 3 }}>
            Billing Information
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Select Property</InputLabel>
                <Select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  label="Select Property"
                >
                  <MenuItem value="">Choose a property</MenuItem>
                  {properties.map((property) => (
                    <MenuItem key={property.id} value={property.id}>
                      {property.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Billing Month"
                type="month"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Rate (Ksh per unit)"
                type="number"
                value={rate}
                onChange={(e) => handleRateChange(e.target.value)}
                fullWidth
                placeholder="Enter rate per unit"
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>Ksh</Typography>
                }}
              />
            </Grid>
          </Grid>

          {selectedProperty && billingMonth && (
            <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                variant="contained"
                onClick={calculateAll}
                startIcon={<Calculate />}
                disabled={!rate}
              >
                Calculate All
              </Button>
              <Button
                variant="contained"
                color={editMode ? "warning" : "primary"}
                onClick={saveBills}
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                disabled={saving || billingData.length === 0}
              >
                {saving ? 'Saving...' : editMode ? 'Update Bills' : 'Save Bills'}
              </Button>
              {billingData.length > 0 && (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={downloadPDF}
                  startIcon={<PictureAsPdf />}
                >
                  Download PDF
                </Button>
              )}
              {editMode && (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                  Editing {existingBills.length} existing bills
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Billing Table */}
      {selectedProperty && billingData.length > 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 'medium' }}>
                {editMode ? 'Edit' : 'Create'} Utility Bills for {properties.find(p => p.id === selectedProperty)?.name}
                <Typography variant="body2" color="text.secondary">
                  {formatDate(formatBillingMonth(billingMonth))}
                </Typography>
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {editMode && (
                  <Tooltip title="Editing existing bills">
                    <Edit color="warning" />
                  </Tooltip>
                )}
                <Tooltip title="Download PDF">
                  <IconButton onClick={downloadPDF} color="primary">
                    <Download />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            
            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
              <Table sx={{ minWidth: 800 }} size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: editMode ? 'warning.main' : 'primary.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Unit No.</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tenant</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Arrears B/F (Ksh)</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Previous Reading</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Current Reading</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Units Consumed</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Rate (Ksh)</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Total Amount (Ksh)</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {billingData.map((row, index) => (
                    <TableRow key={row.unit_id} hover>
                      <TableCell>{row.unit_number}</TableCell>
                      <TableCell>{row.tenant_name}</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          value={row.arrears_bf}
                          onChange={(e) => {
                            const newBillingData = [...billingData];
                            newBillingData[index].arrears_bf = e.target.value;
                            setBillingData(newBillingData);
                          }}
                          size="small"
                          InputProps={{
                            startAdornment: <Typography sx={{ mr: 1, fontSize: '0.8rem' }}>Ksh</Typography>
                          }}
                        />
                      </TableCell>
                      <TableCell>{(parseFloat(row.previous_reading) || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          value={row.current_reading}
                          onChange={(e) => handleCurrentReadingChange(index, e.target.value)}
                          size="small"
                          placeholder="Enter reading"
                        />
                      </TableCell>
                      <TableCell>{(parseFloat(row.units_consumed) || 0).toFixed(2)}</TableCell>
                      <TableCell>{(parseFloat(row.rate) || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(parseFloat(row.total_amount) || 0)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Download Individual Bill">
                          <IconButton 
                            size="small" 
                            onClick={() => downloadIndividualBill(row)}
                            color="primary"
                          >
                            <PictureAsPdf />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
}

export default UtilityBilling;
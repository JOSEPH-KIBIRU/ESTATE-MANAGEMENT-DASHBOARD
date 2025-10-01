import { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../context/AuthContext';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress } from '@mui/material';
import jsPDF from 'jspdf';
import { logoBase64 } from '../assets/logo';

function InvoiceList({ refresh }) {
  const { user } = useContext(AuthContext);
  const [invoices, setInvoices] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [editInvoice, setEditInvoice] = useState(null);
  const [editTenantId, setEditTenantId] = useState('');
  const [editInvoiceType, setEditInvoiceType] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editErrors, setEditErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch invoices
  useEffect(() => {
    const fetchInvoices = async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_type,
          amount,
          due_date,
          created_at,
          tenant_id,
          tenants!inner(name, unit_id, units!inner(unit_number, property_id, properties!inner(name)))
        `);
      console.log('Fetched invoices:', data);
      if (error) {
        setErrorMessage(`Error fetching invoices: ${error.message}`);
      } else {
        setInvoices(data || []);
      }
    };
    if (user) fetchInvoices();
  }, [user, refresh]);

  // Fetch tenants for edit form
  useEffect(() => {
    const fetchTenants = async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, unit_id, units!inner(unit_number, property_id, properties!inner(name))');
      console.log('Fetched tenants for edit:', data);
      if (error) {
        setErrorMessage(`Error fetching tenants: ${error.message}`);
      } else {
        setTenants(data || []);
      }
    };
    if (user) fetchTenants();
  }, [user]);

  const validateEditForm = () => {
    const newErrors = {};
    if (!editTenantId) newErrors.tenantId = 'Please select a tenant';
    if (!editInvoiceType) newErrors.invoiceType = 'Please select an invoice type';
    if (!['Service charge', 'Water', 'Electricity', 'Land rates', 'Others'].includes(editInvoiceType)) {
      newErrors.invoiceType = 'Invalid invoice type';
    }
    if (!editAmount || parseFloat(editAmount) <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (!editDueDate) newErrors.dueDate = 'Due date is required';
    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = (invoice) => {
    setEditInvoice(invoice);
    setEditTenantId(invoice.tenant_id);
    setEditInvoiceType(invoice.invoice_type);
    setEditAmount(invoice.amount);
    setEditDueDate(invoice.due_date.split('T')[0]);
    setEditErrors({});
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleUpdate = async () => {
    if (!validateEditForm()) return;
    setLoading(true);
    try {
      const updateData = {
        tenant_id: editTenantId,
        invoice_type: editInvoiceType,
        amount: parseFloat(editAmount),
        due_date: editDueDate,
      };
      console.log('Updating invoice with data:', updateData);
      const { data, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', editInvoice.id)
        .select();
      if (error) {
        console.error('Update error details:', error);
        throw new Error(`Failed to update invoice: ${error.message} (Code: ${error.code})`);
      }
      console.log('Updated invoice:', data);
      setSuccessMessage('Invoice updated successfully!');
      setEditInvoice(null);
    } catch (error) {
      console.error('Update error:', error);
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async (invoice) => {
    const doc = new jsPDF();
    // eslint-disable-next-line no-unused-vars
    let autoTable;

    // Initialize jsPDF with default settings
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('J.K Estate Management Ltd.', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('000-245 Nairobi Road, Nairobi, Kenya', pageWidth / 2, 28, { align: 'center' });
    doc.text('Phone: +254 798 118 515 | Email: info@estatemgmt.co.ke', pageWidth / 2, 34, { align: 'center' });

    // Logo
    try {
      doc.addImage(logoBase64, 'PNG', 20, 10, 30, 30);
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
      doc.text('Logo Placeholder', 20, 20);
    }

    // Separator
    doc.setLineWidth(0.5);
    doc.line(20, 40, pageWidth - 20, 40);

    // Invoice Title
    doc.setFontSize(16);
    doc.text('INVOICE', pageWidth / 2, 50, { align: 'center' });

    // Tenant Details
    doc.setFontSize(12);
    doc.text('Billed To:', 20, 60);
    doc.text(`${invoice.tenants.name}`, 20, 66);
    doc.text(`Unit: ${invoice.tenants.units.unit_number}`, 20, 72);
    doc.text(`Property: ${invoice.tenants.units.properties.name}`, 20, 78);

    // Shorten invoice ID
    const shortInvoiceId = invoice.id.slice(-4);

    // Enhanced fallback table with perfect alignment and colored header
    const startY = 90;
    const colWidths = [30, 30, 30, 30, 30]; // Fixed widths for each column
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const xStart = (pageWidth - tableWidth) / 2; // Center table
    const headers = ['Invoice ID', 'Type', 'Amount', 'Due Date', 'Created At'];
    const rowData = [
      shortInvoiceId,
      invoice.invoice_type,
      invoice.amount.toFixed(2),
      invoice.due_date.split('T')[0],
      new Date(invoice.created_at).toLocaleDateString(),
    ];

    // Draw header background with precise boundaries
    doc.setFillColor(22, 160, 133);
    doc.rect(xStart, startY - 4, tableWidth, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    let x = xStart;
    headers.forEach((header, i) => {
      const textWidth = doc.getTextWidth(header);
      const xCentered = x + (colWidths[i] - textWidth) / 2;
      doc.text(header, xCentered, startY + 2, { maxWidth: colWidths[i] - 2 });
      x += colWidths[i];
    });

    // Draw table lines
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    x = xStart;
    // Vertical lines
    [0, ...colWidths, tableWidth].reduce((prev, curr) => {
      doc.line(prev + xStart, startY - 4, prev + xStart, startY + 18);
      return prev + curr;
    });
    // Horizontal lines
    doc.line(xStart, startY - 4, xStart + tableWidth, startY - 4); // Top line
    doc.line(xStart, startY + 8, xStart + tableWidth, startY + 8); // Header bottom
    doc.line(xStart, startY + 18, xStart + tableWidth, startY + 18); // Bottom line

    // Draw data row
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    x = xStart;
    rowData.forEach((data, i) => {
      const textWidth = doc.getTextWidth(data);
      const xCentered = x + (colWidths[i] - textWidth) / 2;
      doc.text(data, xCentered, startY + 12, { maxWidth: colWidths[i] - 2 });
      x += colWidths[i];
    });

    // Footer
    const finalY = startY + 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your business!', pageWidth / 2, finalY + 20, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
    doc.text('Generated on: ' + new Date().toLocaleDateString(), pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Save PDF
    doc.save(`invoice_${shortInvoiceId}.pdf`);
  };

  return (
    <div>
      {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">Tenant</TableCell>
              <TableCell align="center">Unit</TableCell>
              <TableCell align="center">Property</TableCell>
              <TableCell align="center">Invoice Type</TableCell>
              <TableCell align="center">Amount</TableCell>
              <TableCell align="center">Due Date</TableCell>
              <TableCell align="center">Created At</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell align="center">{invoice.tenants.name}</TableCell>
                <TableCell align="center">{invoice.tenants.units.unit_number}</TableCell>
                <TableCell align="center">{invoice.tenants.units.properties.name}</TableCell>
                <TableCell align="center">{invoice.invoice_type}</TableCell>
                <TableCell align="center">{invoice.amount.toFixed(2)}</TableCell>
                <TableCell align="center">{invoice.due_date.split('T')[0]}</TableCell>
                <TableCell align="center">{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                <TableCell align="center">
                  <Button
                    variant="outlined"
                    onClick={() => handleEdit(invoice)}
                    sx={{ mr: 1 }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handleGeneratePDF(invoice)}
                  >
                    View/Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Invoice Modal */}
      <Dialog open={!!editInvoice} onClose={() => setEditInvoice(null)}>
        <DialogTitle>Edit Invoice</DialogTitle>
        <DialogContent>
          {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
          {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}
          <FormControl fullWidth margin="normal" error={!!editErrors.tenantId}>
            <InputLabel>Tenant</InputLabel>
            <Select
              value={editTenantId}
              onChange={(e) => setEditTenantId(e.target.value)}
              label="Tenant"
            >
              <MenuItem value=""><em>Select a tenant</em></MenuItem>
              {tenants.map((tenant) => (
                <MenuItem key={tenant.id} value={tenant.id}>
                  {tenant.name} (Unit: {tenant.units.unit_number}, Property: {tenant.units.properties.name})
                </MenuItem>
              ))}
            </Select>
            {editErrors.tenantId && <p style={{ color: 'red', fontSize: '0.75rem' }}>{editErrors.tenantId}</p>}
          </FormControl>
          <FormControl fullWidth margin="normal" error={!!editErrors.invoiceType}>
            <InputLabel>Invoice Type</InputLabel>
            <Select
              value={editInvoiceType}
              onChange={(e) => setEditInvoiceType(e.target.value)}
              label="Invoice Type"
            >
              <MenuItem value=""><em>Select invoice type</em></MenuItem>
              <MenuItem value="Service charge">Service charge</MenuItem>
              <MenuItem value="Water">Water</MenuItem>
              <MenuItem value="Electricity">Electricity</MenuItem>
              <MenuItem value="Land rates">Land rates</MenuItem>
              <MenuItem value="Others">Others</MenuItem>
            </Select>
            {editErrors.invoiceType && <p style={{ color: 'red', fontSize: '0.75rem' }}>{editErrors.invoiceType}</p>}
          </FormControl>
          <TextField
            label="Amount"
            type="number"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            fullWidth
            margin="normal"
            inputProps={{ step: '0.01', min: '0' }}
            error={!!editErrors.amount}
            helperText={editErrors.amount}
          />
          <TextField
            label="Due Date"
            type="date"
            value={editDueDate}
            onChange={(e) => setEditDueDate(e.target.value)}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            error={!!editErrors.dueDate}
            helperText={editErrors.dueDate}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditInvoice(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdate}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Updating...' : 'Update Invoice'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default InvoiceList;
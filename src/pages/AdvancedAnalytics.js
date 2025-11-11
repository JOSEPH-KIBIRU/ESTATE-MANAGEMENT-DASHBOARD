import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  // eslint-disable-next-line no-unused-vars
  Download,
  PictureAsPdf,
  Analytics,
  TrendingUp,
  BarChart,
  People,
  Home,
  AttachMoney,
  Refresh
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const AdvancedAnalytics = () => {
  const [reportType, setReportType] = useState('financial');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch properties on mount
  useEffect(() => {
    fetchProperties();
    fetchDashboardStats();
  }, []);

  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('id, name')
      .order('name');
    if (!error) setProperties(data || []);
  };

  const fetchDashboardStats = async () => {
    setStatsLoading(true);
    try {
      // Fetch properties count
      const { count: propertiesCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true });

      // Fetch units count
      const { count: unitsCount } = await supabase
        .from('units')
        .select('*', { count: 'exact', head: true });

      // Fetch tenants count
      const { count: tenantsCount } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true });

      // Fetch occupied units
      const { count: occupiedUnits } = await supabase
        .from('units')
        .select('*', { count: 'exact', head: true })
        .not('tenant_id', 'is', null);

      // Fetch monthly revenue
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: monthlyPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', `${currentMonth}-01`)
        .lte('payment_date', `${currentMonth}-31`);

      // Fetch pending payments
      const { count: pendingCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const monthlyRevenue = monthlyPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const occupancyRate = unitsCount ? (occupiedUnits / unitsCount) * 100 : 0;

      setDashboardStats({
        totalProperties: propertiesCount || 0,
        totalUnits: unitsCount || 0,
        totalTenants: tenantsCount || 0,
        occupancyRate,
        monthlyRevenue,
        pendingPayments: pendingCount || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, subtitle, color = 'primary' }) => (
    <Card sx={{ height: '100%', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-4px)' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="overline">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              {typeof value === 'number' && title.includes('Revenue') ? `Ksh ${value.toLocaleString()}` : value}
              {title.includes('Rate') && '%'}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color: `${color}.main` }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // ===== Report Generation Functions =====

  const generateReport = async () => {
    setLoading(true);
    try {
      let data = null;

      switch (reportType) {
        case 'financial':
          data = await generateFinancialReport();
          break;
        case 'occupancy':
          data = await generateOccupancyReport();
          break;
        case 'utility':
          data = await generateUtilityReport();
          break;
        case 'tenant':
          data = await generateTenantReport();
          break;
        default:
          break;
      }

      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateFinancialReport = async () => {
    let query = supabase
      .from('payments')
      .select(`
        *,
        tenants (name),
        properties (name)
      `)
      .gte('payment_date', dateRange.start)
      .lte('payment_date', dateRange.end);

    if (selectedProperty !== 'all') {
      query = query.eq('property_id', selectedProperty);
    }

    const { data: payments, error } = await query;

    if (error) throw error;

    const totalRevenue = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const paidPayments = payments?.filter(p => p.status === 'paid').length || 0;
    const pendingPayments = payments?.filter(p => p.status === 'pending').length || 0;

    return {
      type: 'Financial Summary',
      period: `${dateRange.start} to ${dateRange.end}`,
      totalRevenue,
      totalTransactions: payments?.length || 0,
      paidPayments,
      pendingPayments,
      details: payments || []
    };
  };

  const generateOccupancyReport = async () => {
    let query = supabase
      .from('units')
      .select(`
        *,
        properties (name),
        tenants (name, phone, email)
      `);

    if (selectedProperty !== 'all') {
      query = query.eq('property_id', selectedProperty);
    }

    const { data: units, error } = await query;

    if (error) throw error;

    const totalUnits = units?.length || 0;
    const occupiedUnits = units?.filter(unit => unit.tenant_id).length || 0;
    const vacantUnits = totalUnits - occupiedUnits;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    return {
      type: 'Occupancy Report',
      totalUnits,
      occupiedUnits,
      vacantUnits,
      occupancyRate,
      details: units || []
    };
  };

  const generateUtilityReport = async () => {
    let query = supabase
      .from('utility_bills')
      .select(`
        *,
        units (
          unit_number,
          properties (name)
        ),
        tenants (name)
      `)
      .gte('billing_month', dateRange.start.slice(0, 7) + '-01')
      .lte('billing_month', dateRange.end.slice(0, 7) + '-31');

    if (selectedProperty !== 'all') {
      query = query.eq('units.property_id', selectedProperty);
    }

    const { data: bills, error } = await query;

    if (error) throw error;

    const totalConsumption = bills?.reduce((sum, bill) => sum + (bill.units_consumed || 0), 0) || 0;
    const totalAmount = bills?.reduce((sum, bill) => sum + (bill.total_amount || 0), 0) || 0;

    return {
      type: 'Utility Consumption Report',
      period: `${dateRange.start.slice(0, 7)} to ${dateRange.end.slice(0, 7)}`,
      totalConsumption,
      totalAmount,
      averageConsumption: bills?.length ? totalConsumption / bills.length : 0,
      details: bills || []
    };
  };

  const generateTenantReport = async () => {
    let query = supabase
      .from('tenants')
      .select(`
        *,
        units (
          unit_number,
          properties (name)
        ),
        payments (
          amount,
          status,
          payment_date
        )
      `);

    if (selectedProperty !== 'all') {
      query = query.eq('units.property_id', selectedProperty);
    }

    const { data: tenants, error } = await query;

    if (error) throw error;

    const activeTenants = tenants?.filter(t => t.is_active !== false).length || 0;
    const totalTenants = tenants?.length || 0;

    return {
      type: 'Tenant Report',
      totalTenants,
      activeTenants,
      inactiveTenants: totalTenants - activeTenants,
      details: tenants || []
    };
  };

  // ===== PDF Export =====

  const downloadPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text(`${reportData.type} - Estate Management System`, pageWidth / 2, 15, { align: 'center' });

    // Report Details
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25);
    if (reportData.period) {
      doc.text(`Period: ${reportData.period}`, 14, 32);
    }

    let yPos = 45;

    // Summary Section
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('SUMMARY', 14, yPos);
    yPos += 10;

    Object.keys(reportData).forEach(key => {
      if (key !== 'type' && key !== 'period' && key !== 'details' && typeof reportData[key] !== 'object') {
        doc.setFontSize(10);
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const value = typeof reportData[key] === 'number' && key.toLowerCase().includes('revenue') 
          ? `Ksh ${reportData[key].toLocaleString()}`
          : typeof reportData[key] === 'number' && key.toLowerCase().includes('rate')
          ? `${reportData[key].toFixed(1)}%`
          : reportData[key];
        
        doc.text(`${label}: ${value}`, 20, yPos);
        yPos += 6;
      }
    });

    // Details Table
    if (reportData.details && reportData.details.length > 0) {
      yPos += 10;
      const tableData = reportData.details.map((item, index) => {
        switch (reportType) {
          case 'financial':
            return [
              index + 1,
              item.tenants?.name || 'N/A',
              item.properties?.name || 'N/A',
              `Ksh ${item.amount?.toLocaleString()}`,
              item.status,
              new Date(item.payment_date).toLocaleDateString()
            ];
          case 'occupancy':
            return [
              index + 1,
              item.unit_number,
              item.properties?.name || 'N/A',
              item.tenants?.name || 'Vacant',
              item.tenants ? 'Occupied' : 'Vacant'
            ];
          case 'utility':
            return [
              index + 1,
              item.units?.unit_number || 'N/A',
              item.units?.properties?.name || 'N/A',
              (item.units_consumed || 0).toFixed(2),
              `Ksh ${item.total_amount?.toLocaleString()}`,
              item.billing_month?.slice(0, 7)
            ];
          case 'tenant':
            return [
              index + 1,
              item.name,
              item.phone,
              item.email,
              item.units?.unit_number || 'N/A',
              item.units?.properties?.name || 'N/A',
              item.is_active === false ? 'Inactive' : 'Active'
            ];
          default:
            return [index + 1, JSON.stringify(item)];
        }
      });

      const tableColumns = {
        financial: ['#', 'Tenant', 'Property', 'Amount', 'Status', 'Date'],
        occupancy: ['#', 'Unit', 'Property', 'Tenant', 'Status'],
        utility: ['#', 'Unit', 'Property', 'Units Used', 'Amount', 'Billing Month'],
        tenant: ['#', 'Name', 'Phone', 'Email', 'Unit', 'Property', 'Status']
      };

      doc.autoTable({
        head: [tableColumns[reportType] || ['#', 'Details']],
        body: tableData,
        startY: yPos,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });
    }

    doc.save(`${reportData.type.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ===== Render =====

  return (
    <Box sx={{ maxWidth: 1400, margin: '0 auto', p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
        <Analytics sx={{ mr: 2, verticalAlign: 'middle' }} />
        Advanced Analytics & Reports
      </Typography>

      {/* Real-time Stats Overview */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
              Real-time Overview
            </Typography>
            <Button
              onClick={fetchDashboardStats}
              startIcon={statsLoading ? <CircularProgress size={20} /> : <Refresh />}
              size="small"
              disabled={statsLoading}
            >
              {statsLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Box>

          {statsLoading ? (
            <LinearProgress />
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={2}>
                <StatCard
                  title="Properties"
                  value={dashboardStats?.totalProperties || 0}
                  icon={<Home fontSize="large" />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <StatCard
                  title="Units"
                  value={dashboardStats?.totalUnits || 0}
                  icon={<Home fontSize="large" />}
                  subtitle={`${Math.round(dashboardStats?.occupancyRate || 0)}% occupied`}
                  color="info"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <StatCard
                  title="Tenants"
                  value={dashboardStats?.totalTenants || 0}
                  icon={<People fontSize="large" />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Monthly Revenue"
                  value={dashboardStats?.monthlyRevenue || 0}
                  icon={<AttachMoney fontSize="large" />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Occupancy Rate"
                  value={Math.round(dashboardStats?.occupancyRate || 0)}
                  icon={<TrendingUp fontSize="large" />}
                  subtitle="Overall"
                  color="success"
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Report Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: '600' }}>
            Generate Custom Reports
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  label="Report Type"
                >
                  <MenuItem value="financial">
                    <TrendingUp sx={{ mr: 1 }} />
                    Financial Summary
                  </MenuItem>
                  <MenuItem value="occupancy">
                    <BarChart sx={{ mr: 1 }} />
                    Occupancy Report
                  </MenuItem>
                  <MenuItem value="utility">
                    <Analytics sx={{ mr: 1 }} />
                    Utility Report
                  </MenuItem>
                  <MenuItem value="tenant">
                    <People sx={{ mr: 1 }} />
                    Tenant Report
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Property</InputLabel>
                <Select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  label="Property"
                >
                  <MenuItem value="all">All Properties</MenuItem>
                  {properties.map(property => (
                    <MenuItem key={property.id} value={property.id}>
                      {property.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                label="Start Date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                label="End Date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={generateReport}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Analytics />}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
            {reportData && (
              <Button
                variant="outlined"
                onClick={downloadPDF}
                startIcon={<PictureAsPdf />}
              >
                Download PDF
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: '600' }}>
              Report Results - {reportData.type}
            </Typography>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {Object.keys(reportData).map(key => {
                if (key !== 'type' && key !== 'period' && key !== 'details' && typeof reportData[key] !== 'object') {
                  return (
                    <Grid item xs={6} sm={3} key={key}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {typeof reportData[key] === 'number' && key.toLowerCase().includes('revenue') 
                            ? `Ksh ${reportData[key].toLocaleString()}`
                            : typeof reportData[key] === 'number' && key.toLowerCase().includes('rate')
                            ? `${reportData[key].toFixed(1)}%`
                            : reportData[key]}
                        </Typography>
                      </Paper>
                    </Grid>
                  );
                }
                return null;
              })}
            </Grid>

            {/* Details Table */}
            {reportData.details && reportData.details.length > 0 && (
              <>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: '600', mt: 3 }}>
                  Detailed Records
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {reportType === 'financial' && (
                        <>
                          <TableCell>#</TableCell>
                          <TableCell>Tenant</TableCell>
                          <TableCell>Property</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Date</TableCell>
                        </>
                      )}
                      {reportType === 'occupancy' && (
                        <>
                          <TableCell>#</TableCell>
                          <TableCell>Unit</TableCell>
                          <TableCell>Property</TableCell>
                          <TableCell>Tenant</TableCell>
                          <TableCell>Status</TableCell>
                        </>
                      )}
                      {reportType === 'utility' && (
                        <>
                          <TableCell>#</TableCell>
                          <TableCell>Unit</TableCell>
                          <TableCell>Property</TableCell>
                          <TableCell>Units Used</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Billing Month</TableCell>
                        </>
                      )}
                      {reportType === 'tenant' && (
                        <>
                          <TableCell>#</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Phone</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Unit</TableCell>
                          <TableCell>Property</TableCell>
                          <TableCell>Status</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.details.slice(0, 10).map((item, index) => (
                      <TableRow key={item.id || index}>
                        {reportType === 'financial' && (
                          <>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{item.tenants?.name || 'N/A'}</TableCell>
                            <TableCell>{item.properties?.name || 'N/A'}</TableCell>
                            <TableCell>Ksh {item.amount?.toLocaleString()}</TableCell>
                            <TableCell>{item.status}</TableCell>
                            <TableCell>{new Date(item.payment_date).toLocaleDateString()}</TableCell>
                          </>
                        )}
                        {reportType === 'occupancy' && (
                          <>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{item.unit_number}</TableCell>
                            <TableCell>{item.properties?.name || 'N/A'}</TableCell>
                            <TableCell>{item.tenants?.name || 'Vacant'}</TableCell>
                            <TableCell>{item.tenants ? 'Occupied' : 'Vacant'}</TableCell>
                          </>
                        )}
                        {reportType === 'utility' && (
                          <>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{item.units?.unit_number || 'N/A'}</TableCell>
                            <TableCell>{item.units?.properties?.name || 'N/A'}</TableCell>
                            <TableCell>{(item.units_consumed || 0).toFixed(2)}</TableCell>
                            <TableCell>Ksh {item.total_amount?.toLocaleString()}</TableCell>
                            <TableCell>{item.billing_month?.slice(0, 7)}</TableCell>
                          </>
                        )}
                        {reportType === 'tenant' && (
                          <>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.phone}</TableCell>
                            <TableCell>{item.email}</TableCell>
                            <TableCell>{item.units?.unit_number || 'N/A'}</TableCell>
                            <TableCell>{item.units?.properties?.name || 'N/A'}</TableCell>
                            <TableCell>{item.is_active === false ? 'Inactive' : 'Active'}</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {reportData.details.length > 10 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Showing 10 of {reportData.details.length} records. Download PDF for complete report.
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AdvancedAnalytics;
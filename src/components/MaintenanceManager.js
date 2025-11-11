/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Handyman,
  Add,
  CheckCircle,
  Build,
  Cancel,
  Visibility
} from '@mui/icons-material';

const MaintenanceManager = () => {
  const [requests, setRequests] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingTenant, setFetchingTenant] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newRequest, setNewRequest] = useState({
    property_id: '',
    unit_id: '',
    tenant_id: '',
    tenant_name: '',
    tenant_phone: '',
    title: '',
    description: '',
    priority: 'medium',
    category: 'general'
  });

  useEffect(() => {
    fetchMaintenanceRequests();
    fetchProperties();
  }, []);

  // Handle property changes and reset unit selection if needed
  useEffect(() => {
    if (newRequest.property_id && newRequest.unit_id) {
      const currentUnit = units.find(unit => unit.id === newRequest.unit_id);
      if (!currentUnit || currentUnit.property_id !== newRequest.property_id) {
        setNewRequest(prev => ({
          ...prev,
          unit_id: '',
          tenant_id: '',
          tenant_name: '',
          tenant_phone: ''
        }));
      }
    }
  }, [newRequest.property_id, units, newRequest.unit_id]);

  // Fetch properties
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
      setError('Failed to load properties: ' + error.message);
    }
  };

  // Fetch units for selected property
  const fetchUnitsForProperty = async (propertyId) => {
    try {
      if (!propertyId) {
        setUnits([]);
        return;
      }

      console.log('🔄 Fetching units for property:', propertyId);

      const { data, error } = await supabase
        .from('units')
        .select('id, unit_number, property_id')
        .eq('property_id', propertyId)
        .order('unit_number');

      if (error) {
        console.error('❌ Error fetching units:', error);
        throw new Error(`Failed to load units: ${error.message}`);
      }

      console.log('✅ Units found:', data);
      setUnits(data || []);

    } catch (error) {
      console.error('💥 Error in fetchUnitsForProperty:', error);
      setError(error.message);
    }
  };

  // Fetch tenants for selected unit - FIXED (no status column)
  const fetchTenantForUnit = async (unitId) => {
    try {
      setFetchingTenant(true);
      setError('');
      
      if (!unitId) {
        setNewRequest(prev => ({
          ...prev,
          tenant_id: '',
          tenant_name: 'Please select a unit',
          tenant_phone: ''
        }));
        return;
      }

      console.log('🔄 Fetching tenant for unit ID:', unitId);

      // Fetch tenant WITHOUT status filter
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, phone, email, unit_id')
        .eq('unit_id', unitId)
        .maybeSingle();

      if (tenantError) {
        console.error('❌ Tenant query error:', tenantError);
        if (tenantError.code === 'PGRST116') {
          // No tenant found - this is normal
          setNewRequest(prev => ({
            ...prev,
            tenant_id: '',
            tenant_name: 'No tenant assigned',
            tenant_phone: ''
          }));
        } else {
          throw new Error(`Database error: ${tenantError.message}`);
        }
        return;
      }

      console.log('✅ Tenant query result:', tenantData);

      if (tenantData) {
        // Successfully found a tenant
        setNewRequest(prev => ({
          ...prev,
          tenant_id: tenantData.id,
          tenant_name: tenantData.name,
          tenant_phone: tenantData.phone || 'No phone number'
        }));
        console.log('✅ Tenant set:', tenantData.name);
      } else {
        // No tenant found (normal case)
        setNewRequest(prev => ({
          ...prev,
          tenant_id: '',
          tenant_name: 'No tenant assigned',
          tenant_phone: ''
        }));
        console.log('ℹ️ No tenant found for this unit');
      }

    } catch (error) {
      console.error('💥 Error in fetchTenantForUnit:', error);
      setError(`Failed to load tenant: ${error.message}`);
      
      setNewRequest(prev => ({
        ...prev,
        tenant_id: '',
        tenant_name: 'Error loading tenant',
        tenant_phone: ''
      }));
    } finally {
      setFetchingTenant(false);
    }
  };

  const fetchMaintenanceRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching maintenance requests...');

      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          properties:property_id (name),
          units:unit_id (unit_number),
          tenants:tenant_id (name, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }
      
      console.log('Fetched requests:', data);
      setRequests(data || []);

    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      setError('Failed to load maintenance requests: ' + error.message);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const createMaintenanceRequest = async () => {
    try {
      setSubmitting(true);
      setError('');
      
      if (!newRequest.tenant_id || newRequest.tenant_id === '') {
        setError('Please select a property and unit with a tenant');
        return;
      }

      if (!newRequest.title.trim()) {
        setError('Please enter a title for the maintenance request');
        return;
      }

      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert([{
          property_id: newRequest.property_id,
          unit_id: newRequest.unit_id,
          tenant_id: newRequest.tenant_id,
          title: newRequest.title.trim(),
          description: newRequest.description.trim(),
          priority: newRequest.priority,
          category: newRequest.category,
          status: 'pending'
        }])
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      setSuccess('Maintenance request created successfully!');
      setOpenDialog(false);
      
      // Reset form
      setNewRequest({ 
        property_id: '',
        unit_id: '',
        tenant_id: '',
        tenant_name: '',
        tenant_phone: '',
        title: '', 
        description: '', 
        priority: 'medium', 
        category: 'general' 
      });
      
      setUnits([]);
      fetchMaintenanceRequests();
      
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error creating maintenance request:', error);
      setError('Failed to create maintenance request: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateRequestStatus = async (requestId, newStatus) => {
    try {
      setError('');
      const { error } = await supabase
        .from('maintenance_requests')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      setSuccess(`Request marked as ${newStatus.replace('_', ' ')}`);
      fetchMaintenanceRequests();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating request status:', error);
      setError('Failed to update request status: ' + error.message);
    }
  };

  const viewRequestDetails = (request) => {
    setSelectedRequest(request);
    setViewDialog(true);
  };

  // Utility functions (keep the same as before)
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      case 'urgent': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      case 'urgent': return 'Urgent';
      default: return priority;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  const getRequestLocation = (request) => {
    if (request.properties?.name && request.units?.unit_number) {
      return `${request.properties.name} - Unit ${request.units.unit_number}`;
    }
    if (request.tenants?.name) {
      return `Tenant: ${request.tenants.name}`;
    }
    return 'Location not specified';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewRequest({ 
      property_id: '',
      unit_id: '',
      tenant_id: '',
      tenant_name: '',
      tenant_phone: '',
      title: '', 
      description: '', 
      priority: 'medium', 
      category: 'general' 
    });
    setUnits([]);
    setError('');
  };

  return (
    <Box sx={{ maxWidth: 1400, margin: '0 auto', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <Handyman sx={{ mr: 2 }} />
          Maintenance Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{ minWidth: 200 }}
        >
          New Maintenance Request
        </Button>
      </Box>

      {/* Success Alert */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Grid container spacing={3}>
        {/* Statistics Cards */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ textAlign: "center", py: 3 }}>
              <Typography
                variant="h4"
                color="primary"
                sx={{ fontWeight: "bold" }}
              >
                {requests.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Requests
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ textAlign: "center", py: 3 }}>
              <Typography
                variant="h4"
                color="warning.main"
                sx={{ fontWeight: "bold" }}
              >
                {requests.filter((r) => r.status === "pending").length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ textAlign: "center", py: 3 }}>
              <Typography
                variant="h4"
                color="info.main"
                sx={{ fontWeight: "bold" }}
              >
                {requests.filter((r) => r.status === "in_progress").length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ textAlign: "center", py: 3 }}>
              <Typography
                variant="h4"
                color="success.main"
                sx={{ fontWeight: "bold" }}
              >
                {requests.filter((r) => r.status === "completed").length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Requests Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center" }}
              >
                <Handyman sx={{ mr: 1, fontSize: 24 }} />
                Maintenance Requests
              </Typography>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tenant/Unit</TableCell>
                      <TableCell>Title & Description</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No maintenance requests found
                          </Typography>
                          <Button
                            variant="outlined"
                            startIcon={<Add />}
                            onClick={() => setOpenDialog(true)}
                            sx={{ mt: 2 }}
                          >
                            Create First Request
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((request) => (
                        <TableRow
                          key={request.id}
                          sx={{
                            "&:hover": {
                              backgroundColor: "action.hover",
                              cursor: "pointer",
                            },
                          }}
                          onClick={() => viewRequestDetails(request)}
                        >
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: "bold" }}
                            >
                              {request.tenants?.name || "Unknown Tenant"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {getRequestLocation(request)}
                            </Typography>
                            {request.tenants?.phone && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", mt: 0.5 }}
                              >
                                📞 {request.tenants.phone}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: "bold" }}
                            >
                              {request.title}
                            </Typography>
                            {request.description && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", mt: 0.5 }}
                              >
                                {request.description.substring(0, 60)}...
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getPriorityText(request.priority)}
                              color={getPriorityColor(request.priority)}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getStatusText(request.status)}
                              color={getStatusColor(request.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {formatDate(request.created_at)}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Box
                              sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
                            >
                              <Button
                                size="small"
                                startIcon={<Visibility />}
                                onClick={() => viewRequestDetails(request)}
                              >
                                View
                              </Button>
                              {request.status === "pending" && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="warning"
                                  onClick={() =>
                                    updateRequestStatus(
                                      request.id,
                                      "in_progress"
                                    )
                                  }
                                  startIcon={<Build />}
                                >
                                  Start Work
                                </Button>
                              )}
                              {request.status === "in_progress" && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  onClick={() =>
                                    updateRequestStatus(request.id, "completed")
                                  }
                                  startIcon={<CheckCircle />}
                                >
                                  Complete
                                </Button>
                              )}
                              {request.status !== "completed" && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() =>
                                    updateRequestStatus(request.id, "cancelled")
                                  }
                                  startIcon={<Cancel />}
                                >
                                  Cancel
                                </Button>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* New Request Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Add sx={{ mr: 1 }} />
            Create Maintenance Request
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Property Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Property *</InputLabel>
                <Select
                  value={newRequest.property_id}
                  onChange={(e) => {
                    setNewRequest((prev) => ({
                      ...prev,
                      property_id: e.target.value,
                    }));
                    fetchUnitsForProperty(e.target.value);
                  }}
                  label="Property *"
                >
                  {properties.map((property) => (
                    <MenuItem key={property.id} value={property.id}>
                      {property.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Unit Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Unit *</InputLabel>
                <Select
                  value={newRequest.unit_id}
                  onChange={(e) => {
                    setNewRequest((prev) => ({
                      ...prev,
                      unit_id: e.target.value,
                    }));
                    fetchTenantForUnit(e.target.value);
                  }}
                  label="Unit *"
                  disabled={!newRequest.property_id}
                >
                  {units.map((unit) => (
                    <MenuItem key={unit.id} value={unit.id}>
                      Unit {unit.unit_number}
                    </MenuItem>
                  ))}
                  {units.length === 0 && newRequest.property_id && (
                    <MenuItem disabled>No units found</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>

            {/* Auto-populated Tenant Information */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Tenant"
                value={newRequest.tenant_name}
                fullWidth
                disabled
                helperText={
                  fetchingTenant
                    ? "Loading tenant..."
                    : "Auto-populated when unit is selected"
                }
                InputProps={{
                  endAdornment: fetchingTenant ? (
                    <CircularProgress size={20} />
                  ) : null,
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Tenant Phone"
                value={newRequest.tenant_phone}
                fullWidth
                disabled
                helperText="Auto-populated when unit is selected"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Title *"
                value={newRequest.title}
                onChange={(e) =>
                  setNewRequest((prev) => ({ ...prev, title: e.target.value }))
                }
                fullWidth
                placeholder="Brief description of the issue"
                error={!newRequest.title.trim()}
                helperText={
                  !newRequest.title.trim()
                    ? "Title is required"
                    : "e.g., Leaky faucet in kitchen"
                }
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newRequest.priority}
                  onChange={(e) =>
                    setNewRequest((prev) => ({
                      ...prev,
                      priority: e.target.value,
                    }))
                  }
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newRequest.category}
                  onChange={(e) =>
                    setNewRequest((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  label="Category"
                >
                  <MenuItem value="plumbing">Plumbing</MenuItem>
                  <MenuItem value="electrical">Electrical</MenuItem>
                  <MenuItem value="appliance">Appliance</MenuItem>
                  <MenuItem value="structural">Structural</MenuItem>
                  <MenuItem value="general">General</MenuItem>
                  <MenuItem value="cleaning">Cleaning</MenuItem>
                  <MenuItem value="pest_control">Pest Control</MenuItem>
                  <MenuItem value="hvac">HVAC</MenuItem>
                  <MenuItem value="landscaping">Landscaping</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                value={newRequest.description}
                onChange={(e) =>
                  setNewRequest((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                multiline
                rows={4}
                fullWidth
                placeholder="Describe the maintenance issue in detail..."
                helperText="Include specific details about the problem, location, and any relevant information"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={createMaintenanceRequest}
            variant="contained"
            disabled={
              !newRequest.tenant_id || !newRequest.title.trim() || submitting
            }
            startIcon={submitting ? <CircularProgress size={16} /> : <Add />}
          >
            {submitting ? "Creating..." : "Create Request"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Request Details Dialog */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Maintenance Request Details</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Tenant
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedRequest.tenants?.name || "Unknown Tenant"}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary">
                  Location
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {getRequestLocation(selectedRequest)}
                </Typography>

                {selectedRequest.tenants?.phone && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">
                      Contact
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      📞 {selectedRequest.tenants.phone}
                    </Typography>
                  </>
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Priority
                </Typography>
                <Chip
                  label={getPriorityText(selectedRequest.priority)}
                  color={getPriorityColor(selectedRequest.priority)}
                  sx={{ mb: 2 }}
                />

                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={getStatusText(selectedRequest.status)}
                  color={getStatusColor(selectedRequest.status)}
                  sx={{ mb: 2 }}
                />

                <Typography variant="subtitle2" color="text.secondary">
                  Category
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ mb: 2, textTransform: "capitalize" }}
                >
                  {selectedRequest.category?.replace("_", " ") || "General"}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Title
                </Typography>
                <Typography variant="body1" sx={{ mb: 3, fontWeight: "bold" }}>
                  {selectedRequest.title}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    mb: 3,
                    p: 2,
                    backgroundColor: "background.default",
                    borderRadius: 1,
                    minHeight: 100,
                  }}
                >
                  {selectedRequest.description || "No description provided."}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary">
                  Date Created
                </Typography>
                <Typography variant="body1">
                  {formatDate(selectedRequest.created_at)}
                </Typography>

                {selectedRequest.updated_at && (
                  <>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      sx={{ mt: 2 }}
                    >
                      Last Updated
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(selectedRequest.updated_at)}
                    </Typography>
                  </>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
          {selectedRequest && selectedRequest.status !== "completed" && (
            <Button
              variant="contained"
              onClick={() => {
                if (selectedRequest.status === "pending") {
                  updateRequestStatus(selectedRequest.id, "in_progress");
                } else if (selectedRequest.status === "in_progress") {
                  updateRequestStatus(selectedRequest.id, "completed");
                }
                setViewDialog(false);
              }}
              startIcon={
                selectedRequest.status === "in_progress" ? (
                  <CheckCircle />
                ) : (
                  <Build />
                )
              }
            >
              {selectedRequest.status === "in_progress"
                ? "Mark Complete"
                : "Start Work"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
     

export default MaintenanceManager;




// new one 


import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Table, TableBody, TableCell, TableHead, TableRow, 
  Button, Alert, TextField, FormControl, InputLabel, 
  Select, MenuItem, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions,
  Typography, Box, useMediaQuery, Card, CardContent,
  Grid, IconButton, Paper, Divider, CardActions
} from '@mui/material';
import { 
  Warning as WarningIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  Apartment as ApartmentIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

function TenantList({ refresh }) {
  const [tenants, setTenants] = useState([]);
  const [error, setError] = useState('');
  const [editTenant, setEditTenant] = useState(null);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = useState({ 
    open: false, 
    tenantId: null, 
    tenantName: '',
    maintenanceCount: 0 
  });

  // Fetch tenants
  useEffect(() => {
    const fetchTenants = async () => {
      setError('');
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, email, phone, unit_id, units!fk_unit(unit_number, property_id, properties!inner(name))')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching tenants:', error);
        setError(`Failed to load tenants: ${error.message}`);
      } else {
        setTenants(data || []);
      }
    };
    fetchTenants();
  }, [refresh]);

  // Fetch properties for edit form
  useEffect(() => {
    const fetchProperties = async () => {
      const { data, error } = await supabase.from('properties').select('id, name');
      if (error) {
        setError(`Error fetching properties: ${error.message}`);
      } else {
        setProperties(data || []);
      }
    };
    fetchProperties();
  }, []);

  // Fetch units when editing and property changes - WITH NULL CHECK
  useEffect(() => {
    const fetchUnits = async () => {
      setUnits([]);
      // Add null check here
      if (editTenant && editTenant.units?.property_id) {
        const { data, error } = await supabase
          .from('units')
          .select('id, unit_number')
          .eq('property_id', editTenant.units.property_id);
        if (error) {
          setError(`Error fetching units: ${error.message}`);
        } else {
          setUnits(data || []);
        }
      }
    };
    
    fetchUnits();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTenant?.units?.property_id]); 

  const handleEdit = (tenant) => {
    setEditTenant({ 
      ...tenant, 
      units: { 
        property_id: tenant.units?.property_id || '' 
      } 
    });
    setEditErrors({});
  };

  const validateEditForm = () => {
    const newErrors = {};
    if (!editTenant?.units?.property_id) newErrors.propertyId = 'Please select a property';
    if (!editTenant?.unit_id) newErrors.unitId = 'Please select a unit';
    if (!editTenant?.name?.trim()) newErrors.name = 'Tenant name is required';
    else if (editTenant.name.trim().length < 3) newErrors.name = 'Name must be at least 3 characters';
    if (editTenant?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editTenant.email)) newErrors.email = 'Invalid email format';
    if (editTenant?.phone && !/^\+?\d{10,14}$/.test(editTenant.phone)) newErrors.phone = 'Invalid phone number (10-14 digits)';
    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async () => {
    setError('');
    if (!validateEditForm()) return;

    setEditLoading(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          unit_id: editTenant.unit_id,
          name: editTenant.name.trim(),
          email: editTenant.email?.trim() || null,
          phone: editTenant.phone?.trim() || null,
        })
        .eq('id', editTenant.id);
      
      if (error) throw error;
      
      setTenants(
        tenants.map((t) =>
          t.id === editTenant.id
            ? {
                ...editTenant,
                units: {
                  unit_number: units.find((u) => u.id === editTenant.unit_id)?.unit_number || t.units?.unit_number,
                  property_id: editTenant.units.property_id,
                  properties: properties.find((p) => p.id === editTenant.units.property_id) || t.units?.properties,
                },
              }
            : t
        )
      );
      setEditTenant(null);
    } catch (error) {
      setError(`Failed to update tenant: ${error.message}`);
    } finally {
      setEditLoading(false);
    }
  };

  // Check for related records before deleting
  const handleDeleteClick = async (id, name) => {
    try {
      // Check for maintenance requests
      const { data: maintenanceRequests, error } = await supabase
        .from('maintenance_requests')
        .select('id')
        .eq('tenant_id', id);

      if (error) throw error;

      const count = maintenanceRequests?.length || 0;
      
      if (count > 0) {
        // Show warning dialog
        setDeleteDialog({
          open: true,
          tenantId: id,
          tenantName: name,
          maintenanceCount: count
        });
      } else {
        // No related records, proceed with delete
        confirmAndDelete(id, name);
      }
    } catch (error) {
      console.error('Error checking related records:', error);
      setError(`Failed to check related records: ${error.message}`);
    }
  };

  const confirmAndDelete = async (id, name) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete tenant "${name}"? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;
    
    await performDelete(id);
  };

  const performDelete = async (id) => {
    setError('');
    try {
      // First delete related maintenance requests
      const { error: deleteRequestsError } = await supabase
        .from('maintenance_requests')
        .delete()
        .eq('tenant_id', id);
        
      if (deleteRequestsError) throw deleteRequestsError;

      // Now delete the tenant
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setTenants(tenants.filter((tenant) => tenant.id !== id));
      
    } catch (error) {
      console.error('Error deleting tenant:', error);
      setError(`Failed to delete tenant: ${error.message}`);
    } finally {
      setDeleteDialog({ open: false, tenantId: null, tenantName: '', maintenanceCount: 0 });
    }
  };

  // Mobile card view for tenants
  if (isMobile) {
    return (
      <div>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, tenantId: null, tenantName: '', maintenanceCount: 0 })}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            <span>Delete Tenant</span>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              Tenant "{deleteDialog.tenantName}" has <strong>{deleteDialog.maintenanceCount}</strong> maintenance request(s).
            </Typography>
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              Deleting this tenant will also delete all associated maintenance requests. This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, tenantId: null, tenantName: '', maintenanceCount: 0 })}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="error"
              onClick={() => performDelete(deleteDialog.tenantId)}
            >
              Delete Anyway
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Form for Mobile */}
        {editTenant && (
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#2c3e50', fontWeight: 'bold' }}>
              Edit Tenant
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth error={!!editErrors.propertyId}>
                <InputLabel>Property</InputLabel>
                <Select
                  value={editTenant.units?.property_id || ''}
                  onChange={(e) => {
                    setEditTenant({ ...editTenant, units: { ...editTenant.units, property_id: e.target.value }, unit_id: '' });
                  }}
                  label="Property"
                >
                  <MenuItem value=""><em>Select a property</em></MenuItem>
                  {properties.map((property) => (
                    <MenuItem key={property.id} value={property.id}>{property.name}</MenuItem>
                  ))}
                </Select>
                {editErrors.propertyId && <p style={{ color: 'red', fontSize: '0.75rem' }}>{editErrors.propertyId}</p>}
              </FormControl>
              
              <FormControl fullWidth error={!!editErrors.unitId}>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={editTenant.unit_id || ''}
                  onChange={(e) => setEditTenant({ ...editTenant, unit_id: e.target.value })}
                  label="Unit"
                  disabled={!editTenant.units?.property_id}
                >
                  <MenuItem value=""><em>Select a unit</em></MenuItem>
                  {units.map((unit) => (
                    <MenuItem key={unit.id} value={unit.id}>{unit.unit_number}</MenuItem>
                  ))}
                </Select>
                {editErrors.unitId && <p style={{ color: 'red', fontSize: '0.75rem' }}>{editErrors.unitId}</p>}
              </FormControl>
              
              <TextField
                label="Tenant Name"
                value={editTenant.name || ''}
                onChange={(e) => setEditTenant({ ...editTenant, name: e.target.value })}
                fullWidth
                error={!!editErrors.name}
                helperText={editErrors.name}
              />
              
              <TextField
                label="Email (Optional)"
                value={editTenant.email || ''}
                onChange={(e) => setEditTenant({ ...editTenant, email: e.target.value })}
                fullWidth
                error={!!editErrors.email}
                helperText={editErrors.email}
              />
              
              <TextField
                label="Phone (Optional)"
                value={editTenant.phone || ''}
                onChange={(e) => setEditTenant({ ...editTenant, phone: e.target.value })}
                fullWidth
                error={!!editErrors.phone}
                helperText={editErrors.phone}
              />
              
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleUpdate}
                  disabled={editLoading}
                  fullWidth
                >
                  {editLoading ? <CircularProgress size={24} /> : 'Update'}
                </Button>
                <Button variant="outlined" onClick={() => setEditTenant(null)} fullWidth>
                  Cancel
                </Button>
              </Box>
            </Box>
          </Paper>
        )}

        {/* Mobile Card View */}
        <Box sx={{ p: 2 }}>
          {tenants.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">No tenants found</Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {tenants.map((tenant) => (
                <Grid item xs={12} key={tenant.id}>
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PersonIcon sx={{ color: '#11a99f', mr: 1 }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                          {tenant.name}
                        </Typography>
                      </Box>
                      
                      <Divider sx={{ my: 1.5 }} />
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {tenant.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <EmailIcon sx={{ color: '#3498db', mr: 1, fontSize: 20 }} />
                            <Typography variant="body2">{tenant.email}</Typography>
                          </Box>
                        )}
                        
                        {tenant.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PhoneIcon sx={{ color: '#27ae60', mr: 1, fontSize: 20 }} />
                            <Typography variant="body2">{tenant.phone}</Typography>
                          </Box>
                        )}
                        
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <ApartmentIcon sx={{ color: '#e67e22', mr: 1, fontSize: 20 }} />
                          <Typography variant="body2">
                            Unit: {tenant.units?.unit_number || 'Unknown'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <HomeIcon sx={{ color: '#9b59b6', mr: 1, fontSize: 20 }} />
                          <Typography variant="body2">
                            Property: {tenant.units?.properties?.name || 'Unknown'}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                    
                    <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => handleEdit(tenant)}
                        sx={{ 
                          mr: 1,
                          borderColor: '#11a99f',
                          color: '#11a99f'
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteClick(tenant.id, tenant.name)}
                        sx={{ 
                          borderColor: '#e74c3c',
                          color: '#e74c3c'
                        }}
                      >
                        Delete
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </div>
    );
  }

  // Desktop Table View
  return (
    <div>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, tenantId: null, tenantName: '', maintenanceCount: 0 })}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <span>Delete Tenant</span>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Tenant "{deleteDialog.tenantName}" has <strong>{deleteDialog.maintenanceCount}</strong> maintenance request(s).
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            Deleting this tenant will also delete all associated maintenance requests. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, tenantId: null, tenantName: '', maintenanceCount: 0 })}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={() => performDelete(deleteDialog.tenantId)}
          >
            Delete Anyway
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Form */}
      {editTenant && (
        <Paper sx={{ p: 3, mb: 3, maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#2c3e50', fontWeight: 'bold' }}>
            Edit Tenant
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth error={!!editErrors.propertyId}>
              <InputLabel>Property</InputLabel>
              <Select
                value={editTenant.units?.property_id || ''}
                onChange={(e) => {
                  setEditTenant({ ...editTenant, units: { ...editTenant.units, property_id: e.target.value }, unit_id: '' });
                }}
                label="Property"
              >
                <MenuItem value=""><em>Select a property</em></MenuItem>
                {properties.map((property) => (
                  <MenuItem key={property.id} value={property.id}>{property.name}</MenuItem>
                ))}
              </Select>
              {editErrors.propertyId && <p style={{ color: 'red', fontSize: '0.75rem' }}>{editErrors.propertyId}</p>}
            </FormControl>
            
            <FormControl fullWidth error={!!editErrors.unitId}>
              <InputLabel>Unit</InputLabel>
              <Select
                value={editTenant.unit_id || ''}
                onChange={(e) => setEditTenant({ ...editTenant, unit_id: e.target.value })}
                label="Unit"
                disabled={!editTenant.units?.property_id}
              >
                <MenuItem value=""><em>Select a unit</em></MenuItem>
                {units.map((unit) => (
                  <MenuItem key={unit.id} value={unit.id}>{unit.unit_number}</MenuItem>
                ))}
              </Select>
              {editErrors.unitId && <p style={{ color: 'red', fontSize: '0.75rem' }}>{editErrors.unitId}</p>}
            </FormControl>
            
            <TextField
              label="Tenant Name"
              value={editTenant.name || ''}
              onChange={(e) => setEditTenant({ ...editTenant, name: e.target.value })}
              fullWidth
              error={!!editErrors.name}
              helperText={editErrors.name}
            />
            
            <TextField
              label="Email (Optional)"
              value={editTenant.email || ''}
              onChange={(e) => setEditTenant({ ...editTenant, email: e.target.value })}
              fullWidth
              error={!!editErrors.email}
              helperText={editErrors.email}
            />
            
            <TextField
              label="Phone (Optional)"
              value={editTenant.phone || ''}
              onChange={(e) => setEditTenant({ ...editTenant, phone: e.target.value })}
              fullWidth
              error={!!editErrors.phone}
              helperText={editErrors.phone}
            />
            
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleUpdate}
                disabled={editLoading}
                startIcon={editLoading ? <CircularProgress size={20} /> : null}
              >
                {editLoading ? 'Updating...' : 'Update'}
              </Button>
              <Button variant="outlined" onClick={() => setEditTenant(null)}>
                Cancel
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Tenants Table */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Unit</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Property</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tenants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">No tenants found</TableCell>
            </TableRow>
          ) : (
            tenants.map((tenant) => (
              <TableRow key={tenant.id} hover>
                <TableCell>{tenant.name}</TableCell>
                <TableCell>{tenant.email || '-'}</TableCell>
                <TableCell>{tenant.phone || '-'}</TableCell>
                <TableCell>{tenant.units?.unit_number || 'Unknown'}</TableCell>
                <TableCell>{tenant.units?.properties?.name || 'Unknown'}</TableCell>
                <TableCell>
                  <IconButton 
                    color="primary" 
                    onClick={() => handleEdit(tenant)}
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    color="error" 
                    size="small"
                    onClick={() => handleDeleteClick(tenant.id, tenant.name)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default TenantList;

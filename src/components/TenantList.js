import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableRow, Button, Alert, TextField, FormControl, InputLabel, Select, MenuItem, CircularProgress } from '@mui/material';

function TenantList({ refresh }) {
  const [tenants, setTenants] = useState([]);
  const [error, setError] = useState('');
  const [editTenant, setEditTenant] = useState(null);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editErrors, setEditErrors] = useState({});

  // Fetch tenants
  useEffect(() => {
    const fetchTenants = async () => {
      setError('');
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, email, phone, unit_id, units!fk_unit(unit_number, property_id, properties!fk_property(name))')
        .order('created_at', { ascending: false });
      console.log('Fetched tenants:', data);
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

  // Fetch units when editing and property changes
  useEffect(() => {
    const fetchUnits = async () => {
      setUnits([]);
      if (editTenant?.units?.property_id) {
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
    if (editTenant) fetchUnits();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTenant?.units?.property_id]);

  const handleEdit = (tenant) => {
    setEditTenant({ ...tenant, units: { property_id: tenant.units?.property_id || '' } });
    setEditErrors({});
  };

  const validateEditForm = () => {
    const newErrors = {};
    if (!editTenant.units.property_id) newErrors.propertyId = 'Please select a property';
    if (!editTenant.unit_id) newErrors.unitId = 'Please select a unit';
    if (!editTenant.name.trim()) newErrors.name = 'Tenant name is required';
    else if (editTenant.name.trim().length < 3) newErrors.name = 'Name must be at least 3 characters';
    if (editTenant.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editTenant.email)) newErrors.email = 'Invalid email format';
    if (editTenant.phone && !/^\+?\d{10,14}$/.test(editTenant.phone)) newErrors.phone = 'Invalid phone number (10-14 digits)';
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
                  unit_number: units.find((u) => u.id === editTenant.unit_id)?.unit_number || t.units.unit_number,
                  property_id: editTenant.units.property_id,
                  properties: properties.find((p) => p.id === editTenant.units.property_id) || t.units.properties,
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

  const handleDelete = async (id) => {
    setError('');
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) {
      console.error('Error deleting tenant:', error);
      setError(`Failed to delete tenant: ${error.message}`);
    } else {
      setTenants(tenants.filter((tenant) => tenant.id !== id));
    }
  };

  return (
    <div>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {editTenant && (
        <div style={{ margin: '20px 0', maxWidth: 600 }}>
          <h3>Edit Tenant</h3>
          <FormControl fullWidth margin="normal" error={!!editErrors.propertyId}>
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
          <FormControl fullWidth margin="normal" error={!!editErrors.unitId}>
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
            margin="normal"
            error={!!editErrors.name}
            helperText={editErrors.name}
          />
          <TextField
            label="Email (Optional)"
            value={editTenant.email || ''}
            onChange={(e) => setEditTenant({ ...editTenant, email: e.target.value })}
            fullWidth
            margin="normal"
            error={!!editErrors.email}
            helperText={editErrors.email}
          />
          <TextField
            label="Phone (Optional)"
            value={editTenant.phone || ''}
            onChange={(e) => setEditTenant({ ...editTenant, phone: e.target.value })}
            fullWidth
            margin="normal"
            error={!!editErrors.phone}
            helperText={editErrors.phone}
          />
          <Button
            variant="contained"
            onClick={handleUpdate}
            disabled={editLoading}
            startIcon={editLoading ? <CircularProgress size={20} /> : null}
            sx={{ mr: 1 }}
          >
            {editLoading ? 'Updating...' : 'Update'}
          </Button>
          <Button variant="outlined" onClick={() => setEditTenant(null)}>
            Cancel
          </Button>
        </div>
      )}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Unit</TableCell>
            <TableCell>Property</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tenants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>No tenants found</TableCell>
            </TableRow>
          ) : (
            tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell>{tenant.name}</TableCell>
                <TableCell>{tenant.email || '-'}</TableCell>
                <TableCell>{tenant.phone || '-'}</TableCell>
                <TableCell>{tenant.units?.unit_number || 'Unknown'}</TableCell>
                <TableCell>{tenant.units?.properties?.name || 'Unknown'}</TableCell>
                <TableCell>
                  <Button onClick={() => handleEdit(tenant)}>Edit</Button>
                  <Button color="error" onClick={() => handleDelete(tenant.id)}>
                    Delete
                  </Button>
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
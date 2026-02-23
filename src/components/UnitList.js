import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Chip,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Edit, Delete, AttachMoney, Refresh } from '@mui/icons-material';

function UnitList({ refresh }) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [editForm, setEditForm] = useState({ rent_amount: '', unit_type: '' });

  useEffect(() => {
    fetchUnits();
  }, [refresh]);

  const fetchUnits = async () => {
    setLoading(true);
    setError('');
    
    try {
      // FIXED: Remove 'status' from tenants selection since the column doesn't exist
      const { data, error } = await supabase
        .from('units')
        .select(`
          *,
          properties (name),
          tenants (id, name)  // REMOVED: , status
        `)
        .order('unit_number');
      
      if (error) {
        console.error('❌ Units query failed:', error);
        throw new Error(`Failed to load units: ${error.message}`);
      }
      
      setUnits(data || []);
      
    } catch (err) {
      console.error('💥 Error fetching units:', err);
      setError(err.message);
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      // First check for related maintenance requests
      const { data: maintenanceRequests, error: checkError } = await supabase
        .from('maintenance_requests')
        .select('id, title')
        .eq('unit_id', id);

      if (checkError) {
        console.error('Error checking maintenance requests:', checkError);
        throw checkError;
      }

      // Check for related tenants
      const { data: tenants, error: tenantCheckError } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('unit_id', id);

      if (tenantCheckError) {
        console.error('Error checking tenants:', tenantCheckError);
        throw tenantCheckError;
      }

      // Build warning message if there are related records
      let warningMessage = 'Are you sure you want to delete this unit?';
      let hasRelatedRecords = false;

      if (maintenanceRequests && maintenanceRequests.length > 0) {
        hasRelatedRecords = true;
        warningMessage += `\n\n⚠️ This unit has ${maintenanceRequests.length} maintenance request(s) that will also be deleted.`;
      }

      if (tenants && tenants.length > 0) {
        hasRelatedRecords = true;
        warningMessage += `\n\n⚠️ This unit has ${tenants.length} tenant(s) assigned. Please reassign or remove tenants first.`;
        
        // Don't allow deletion if tenants are assigned
        setError(`Cannot delete unit: ${tenants.length} tenant(s) are still assigned to this unit. Please reassign or remove tenants first.`);
        return;
      }

      if (hasRelatedRecords) {
        warningMessage += '\n\nThis action cannot be undone.';
      }

      if (!window.confirm(warningMessage)) return;

      // Delete related maintenance requests first
      if (maintenanceRequests && maintenanceRequests.length > 0) {
        const { error: deleteMaintenanceError } = await supabase
          .from('maintenance_requests')
          .delete()
          .eq('unit_id', id);

        if (deleteMaintenanceError) {
          console.error('Error deleting maintenance requests:', deleteMaintenanceError);
          throw new Error(`Failed to delete related maintenance requests: ${deleteMaintenanceError.message}`);
        }
      }

      // Now delete the unit
      const { error } = await supabase.from('units').delete().eq('id', id);
      if (error) throw error;
      
      fetchUnits();
    } catch (err) {
      console.error('Error deleting unit:', err);
      setError('Failed to delete unit: ' + err.message);
    }
  };

  const handleEdit = (unit) => {
    setSelectedUnit(unit);
    setEditForm({
      rent_amount: unit.rent_amount || '',
      unit_type: unit.unit_type || 'residential'
    });
    setEditDialog(true);
  };

  const updateUnit = async () => {
    try {
      const { error } = await supabase
        .from('units')
        .update({
          rent_amount: parseFloat(editForm.rent_amount) || null,
          unit_type: editForm.unit_type,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUnit.id);

      if (error) throw error;

      setEditDialog(false);
      fetchUnits();
    } catch (err) {
      console.error('Error updating unit:', err);
      setError('Failed to update unit: ' + err.message);
    }
  };

  // FIXED: Simplified status logic since we don't have status column
  const getStatusColor = (unit) => {
    // If unit has any tenants, consider it occupied
    if (unit.tenants && unit.tenants.length > 0) {
      return 'success';
    }
    return 'default';
  };

  const getStatusText = (unit) => {
    // If unit has any tenants, consider it occupied
    if (unit.tenants && unit.tenants.length > 0) {
      return 'Occupied';
    }
    return 'Vacant';
  };

  const getTenantName = (unit) => {
    if (unit.tenants && unit.tenants.length > 0) {
      return unit.tenants[0].name;
    }
    return 'No tenant';
  };

  const getPropertyName = (unit) => {
    return unit.properties?.name || 'Unknown Property';
  };

  return (
    <Box>
      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }} 
          onClose={() => setError('')}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={fetchUnits}
              startIcon={<Refresh />}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Unit Number</strong></TableCell>
              <TableCell><strong>Property</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Monthly Rent</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Tenant</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {units.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No units found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Add units through the Properties section
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              units.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell>
                    <strong>{unit.unit_number}</strong>
                  </TableCell>
                  <TableCell>{getPropertyName(unit)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={unit.unit_type || 'residential'} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AttachMoney color="action" fontSize="small" />
                      <strong>
                        {unit.rent_amount ? `Ksh ${unit.rent_amount.toLocaleString()}` : 'Not set'}
                      </strong>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getStatusText(unit)} 
                      color={getStatusColor(unit)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {getTenantName(unit)}
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      onClick={() => handleEdit(unit)}
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleDelete(unit.id)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Unit Details</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Monthly Rent (KES)"
              value={editForm.rent_amount}
              onChange={(e) => setEditForm(prev => ({ ...prev, rent_amount: e.target.value }))}
              type="number"
              fullWidth
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>Ksh</Typography>
              }}
            />
            <TextField
              label="Unit Type"
              value={editForm.unit_type}
              onChange={(e) => setEditForm(prev => ({ ...prev, unit_type: e.target.value }))}
              select
              fullWidth
              SelectProps={{
                native: true,
              }}
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="storage">Storage</option>
              <option value="parking">Parking</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={updateUnit} variant="contained">
            Update Unit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UnitList;

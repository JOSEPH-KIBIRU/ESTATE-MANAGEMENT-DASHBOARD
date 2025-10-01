import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Box,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import { Edit, Delete, Save, Cancel } from '@mui/icons-material';

function PropertyList({ refresh }) {
  const [properties, setProperties] = useState([]);
  const [editingProperty, setEditingProperty] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', location: '' });
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchProperties();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const fetchProperties = async () => {
    const { data, error } = await supabase.from('properties').select('*').order('name');
    if (error) {
      console.error('Error fetching properties:', error);
      showSnackbar('Error fetching properties', 'error');
    } else {
      setProperties(data || []);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleEditClick = (property) => {
    setEditingProperty(property);
    setEditFormData({
      name: property.name || '',
      location: property.location || ''
    });
    setOpenEditDialog(true);
  };

  const handleEditSave = async () => {
    if (!editFormData.name.trim()) {
      showSnackbar('Property name is required', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('properties')
        .update({
          name: editFormData.name.trim(),
          location: editFormData.location.trim()
        })
        .eq('id', editingProperty.id);

      if (error) throw error;

      // Update local state
      setProperties(properties.map(prop => 
        prop.id === editingProperty.id 
          ? { ...prop, ...editFormData }
          : prop
      ));

      showSnackbar('Property updated successfully');
      handleEditCancel();
    } catch (error) {
      console.error('Error updating property:', error);
      showSnackbar('Error updating property', 'error');
    }
  };

  const handleEditCancel = () => {
    setEditingProperty(null);
    setEditFormData({ name: '', location: '' });
    setOpenEditDialog(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    try {
      // Check if property has units
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id')
        .eq('property_id', id)
        .limit(1);

      if (unitsError) throw unitsError;

      if (units && units.length > 0) {
        showSnackbar('Cannot delete property with existing units. Please delete all units first.', 'error');
        return;
      }

      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;

      setProperties(properties.filter((prop) => prop.id !== id));
      showSnackbar('Property deleted successfully');
    } catch (error) {
      console.error('Error deleting property:', error);
      showSnackbar('Error deleting property', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {properties.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} align="center">
                No properties found
              </TableCell>
            </TableRow>
          ) : (
            properties.map((property) => (
              <TableRow 
                key={property.id}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                hover
              >
                <TableCell>{property.name}</TableCell>
                <TableCell>{property.location || 'N/A'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton 
                      color="primary" 
                      onClick={() => handleEditClick(property)}
                      size="small"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      onClick={() => handleDelete(property.id)}
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={handleEditCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit Property
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Property Name"
              name="name"
              value={editFormData.name}
              onChange={handleInputChange}
              fullWidth
              required
              error={!editFormData.name.trim()}
              helperText={!editFormData.name.trim() ? 'Property name is required' : ''}
            />
            <TextField
              label="Location"
              name="location"
              value={editFormData.location}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={2}
              placeholder="Enter property address or location"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditCancel} startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button 
            onClick={handleEditSave} 
            variant="contained" 
            startIcon={<Save />}
            disabled={!editFormData.name.trim()}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default PropertyList;
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
  Alert,
  Paper,
  Typography,
  useMediaQuery,
  Card,
  CardContent,
  CardActions,
  Divider,
  Grid
} from '@mui/material';
import { Edit, Delete, Save, Cancel, LocationOn, Home } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

function PropertyList({ refresh }) {
  const [properties, setProperties] = useState([]);
  const [editingProperty, setEditingProperty] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', location: '' });
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

  // Mobile card view
  if (isMobile) {
    return (
      <>
        <Box sx={{ p: 2 }}>
          {properties.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No properties found
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {properties.map((property) => (
                <Grid item xs={12} key={property.id}>
                  <Card 
                    elevation={2}
                    sx={{
                      borderRadius: 2,
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4
                      }
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Home sx={{ color: '#11a99f', mr: 1 }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                          {property.name}
                        </Typography>
                      </Box>
                      
                      <Divider sx={{ my: 1.5 }} />
                      
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 1 }}>
                        <LocationOn sx={{ color: '#e67e22', mr: 1, fontSize: 20, mt: 0.3 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                          {property.location || 'No location specified'}
                        </Typography>
                      </Box>
                    </CardContent>
                    
                    <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={() => handleEditClick(property)}
                        sx={{ 
                          mr: 1,
                          borderColor: '#11a99f',
                          color: '#11a99f',
                          '&:hover': {
                            borderColor: '#0d8c83',
                            backgroundColor: 'rgba(17, 169, 159, 0.04)'
                          }
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Delete />}
                        onClick={() => handleDelete(property.id)}
                        sx={{ 
                          borderColor: '#e74c3c',
                          color: '#e74c3c',
                          '&:hover': {
                            borderColor: '#c0392b',
                            backgroundColor: 'rgba(231, 76, 60, 0.04)'
                          }
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

        {/* Edit Dialog */}
        <Dialog open={openEditDialog} onClose={handleEditCancel} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Property</DialogTitle>
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

  // Desktop table view
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
        <DialogTitle>Edit Property</DialogTitle>
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

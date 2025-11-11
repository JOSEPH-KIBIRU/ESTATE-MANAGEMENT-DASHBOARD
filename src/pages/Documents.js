import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Paper,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Folder,
  Upload,
  Search,
  Description,
  PictureAsPdf,
  Image,
  InsertDriveFile,
  Delete,
  Download,
  Add,
  Link as LinkIcon
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [newDocument, setNewDocument] = useState({
    name: '',
    category: '',
    file: null
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [storageStatus, setStorageStatus] = useState('checking');

  const categories = [
    'Lease Agreements',
    'Property Documents',
    'Tenant Documents',
    'Financial Records',
    'Maintenance Reports',
    'Insurance',
    'Legal',
    'Other'
  ];

  useEffect(() => {
    fetchDocuments();
    checkStorageBucket();
  }, []);

  const checkStorageBucket = async () => {
    try {
      console.log('Checking storage bucket...');
      // eslint-disable-next-line no-unused-vars
      const { data, error } = await supabase.storage.from('documents').list('', { limit: 1 });
      
      if (error) {
        console.error('Storage bucket check failed:', error);
        if (error.message.includes('Bucket not found')) {
          setStorageStatus('not-found');
          setError('Storage bucket "documents" not found. Please create it in Supabase Storage.');
        } else {
          setStorageStatus('error');
          setError('Storage access error: ' + error.message);
        }
        return false;
      }
      
      setStorageStatus('ready');
      return true;
    } catch (error) {
      console.error('Storage check error:', error);
      setStorageStatus('error');
      return false;
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      console.log('Fetching documents...');
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        throw error;
      }
      
      console.log('Fetched documents:', data);
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to load documents: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return <PictureAsPdf color="error" />;
    if (fileType?.includes('image')) return <Image color="primary" />;
    if (fileType?.includes('word') || fileType?.includes('document')) return <Description color="info" />;
    return <InsertDriveFile color="action" />;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setNewDocument(prev => ({
      ...prev,
      file: file,
      name: file.name
    }));
    setError('');
  };

  const uploadDocument = async () => {
    if (!newDocument.file || !newDocument.category) {
      setError('Please select a file and category');
      return;
    }

    if (!newDocument.name.trim()) {
      setError('Please enter a document name');
      return;
    }

    if (storageStatus !== 'ready') {
      setError('Storage not ready. Please create the "documents" bucket in Supabase Storage first.');
      return;
    }

    try {
      setUploading(true);
      setError('');

      // Upload file to Supabase Storage with unique name
      const fileExt = newDocument.file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      console.log('Uploading file to storage:', fileName);

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, newDocument.file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('Storage upload successful:', uploadData);

      // Get public URL - construct it manually to ensure it's correct
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
      const fileUrl = `${supabaseUrl}/storage/v1/object/public/documents/${fileName}`;

      console.log('Public URL:', fileUrl);

      // Prepare data for database
      const documentData = {
        name: newDocument.name,
        file_name: fileName,
        file_url: fileUrl,
        category: newDocument.category,
        file_type: newDocument.file.type,
        file_size: newDocument.file.size
      };

      console.log('Saving to database:', documentData);

      // Save document metadata to database
      const { data: dbData, error: dbError } = await supabase
        .from('documents')
        .insert(documentData)
        .select();

      if (dbError) {
        console.error('Database insert error:', dbError);
        
        // Try to delete the uploaded file if database insert fails
        if (uploadData) {
          await supabase.storage.from('documents').remove([fileName]);
        }
        
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log('Database insert successful:', dbData);

      // Refresh documents list
      await fetchDocuments();
      setUploadDialogOpen(false);
      setNewDocument({ name: '', category: '', file: null });
      setSuccess('Document uploaded successfully!');
      
      setTimeout(() => setSuccess(''), 5000);

    } catch (error) {
      console.error('Error uploading document:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadDocument = async (document) => {
    try {
      console.log('Downloading document:', document);
      
      // Method 1: Try to use the stored file_url first
      if (document.file_url) {
        console.log('Using file_url:', document.file_url);
        window.open(document.file_url, '_blank');
        return;
      }

      // Method 2: Construct the URL manually
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
      const manualUrl = `${supabaseUrl}/storage/v1/object/public/documents/${document.file_name}`;
      console.log('Trying manual URL:', manualUrl);
      
      // Test if the URL is accessible
      const testResponse = await fetch(manualUrl, { method: 'HEAD' });
      if (testResponse.ok) {
        window.open(manualUrl, '_blank');
        return;
      }

      // Method 3: Use Supabase storage download (as fallback)
      console.log('Trying storage download...');
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_name);

      if (error) {
        console.error('Storage download error:', error);
        throw new Error(`Download failed: ${error.message}`);
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Download failed: ' + error.message + '. Please check if the storage bucket exists.');
    }
  };

  const viewDocument = (document) => {
    // Always try to open in new tab first
    if (document.file_url) {
      window.open(document.file_url, '_blank');
      return;
    }
    
    // Fallback to manual URL construction
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const manualUrl = `${supabaseUrl}/storage/v1/object/public/documents/${document.file_name}`;
    window.open(manualUrl, '_blank');
  };

  const deleteDocument = async (documentId, fileName) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      // Try to delete from storage
      try {
        await supabase.storage.from('documents').remove([fileName]);
        console.log('File deleted from storage:', fileName);
      } catch (storageError) {
        console.warn('Could not delete from storage:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      console.log('Document deleted from database:', documentId);

      // Refresh list
      await fetchDocuments();
      setSuccess('Document deleted successfully!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Error deleting document: ' + error.message);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <Folder sx={{ mr: 2, color: 'primary.main' }} />
          Document Management
          {storageStatus === 'not-found' && (
            <Chip 
              label="Storage Missing" 
              color="error" 
              size="small" 
              sx={{ ml: 2 }} 
            />
          )}
          {storageStatus === 'ready' && (
            <Chip 
              label="Storage Ready" 
              color="success" 
              size="small" 
              sx={{ ml: 2 }} 
            />
          )}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setUploadDialogOpen(true)}
          disabled={storageStatus !== 'ready'}
        >
          Upload Document
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          <Typography variant="subtitle2">Error</Typography>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Storage Setup Instructions */}
      {storageStatus === 'not-found' && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="h6">Storage Setup Required</Typography>
          <Typography variant="body2">
            To upload and download documents, please create a storage bucket in your Supabase project:
          </Typography>
          <ol>
            <li>Go to your <strong>Supabase Dashboard</strong></li>
            <li>Click on <strong>Storage</strong> in the left sidebar</li>
            <li>Click <strong>Create New Bucket</strong></li>
            <li>Name: <strong>documents</strong> (exactly this name)</li>
            <li>Check <strong>Public</strong> option</li>
            <li>Click <strong>Create Bucket</strong></li>
            <li>Refresh this page after creation</li>
          </ol>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={checkStorageBucket}
            sx={{ mt: 1 }}
          >
            Check Again
          </Button>
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Description sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {documents.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Documents
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PictureAsPdf sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {documents.filter(d => d.file_type?.includes('pdf')).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                PDF Files
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Image sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {documents.filter(d => d.file_type?.includes('image')).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Images
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <InsertDriveFile sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {documents.filter(d => !d.file_type?.includes('pdf') && !d.file_type?.includes('image')).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Other Files
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {categories.map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Documents List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <List>
            {filteredDocuments.length === 0 ? (
              <ListItem>
                <ListItemText 
                  primary="No documents found"
                  secondary={documents.length === 0 ? "Upload your first document to get started" : "Try changing your search or filter criteria"}
                />
              </ListItem>
            ) : (
              filteredDocuments.map((document) => (
                <ListItem key={document.id} divider>
                  <ListItemIcon>
                    {getFileIcon(document.file_type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" component="span">
                          {document.name}
                        </Typography>
                        <Chip 
                          label={document.category} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Size: {formatFileSize(document.file_size)} • 
                          Uploaded: {new Date(document.created_at).toLocaleDateString()}
                        </Typography>
                        {document.file_url && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            File: {document.file_name}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      onClick={() => viewDocument(document)}
                      title="View Document"
                      sx={{ mr: 1 }}
                    >
                      <LinkIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => downloadDocument(document)}
                      title="Download"
                      sx={{ mr: 1 }}
                    >
                      <Download />
                    </IconButton>
                    <IconButton 
                      onClick={() => deleteDocument(document.id, document.file_name)}
                      title="Delete"
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))
            )}
          </List>
        </Paper>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload New Document</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Document Name"
              value={newDocument.name}
              onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
              sx={{ mb: 2 }}
              helperText="Give your document a descriptive name"
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Category *</InputLabel>
              <Select
                value={newDocument.category}
                label="Category *"
                onChange={(e) => setNewDocument(prev => ({ ...prev, category: e.target.value }))}
              >
                {categories.map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<Upload />}
              sx={{ mb: 1 }}
            >
              Select File (Max 5MB)
              <input
                type="file"
                hidden
                onChange={handleFileUpload}
              />
            </Button>
            
            {newDocument.file && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Selected: {newDocument.file.name} ({formatFileSize(newDocument.file.size)})
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button 
            onClick={uploadDocument} 
            variant="contained"
            disabled={uploading || !newDocument.file || !newDocument.category || storageStatus !== 'ready'}
            startIcon={uploading ? <CircularProgress size={20} /> : <Upload />}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Documents;
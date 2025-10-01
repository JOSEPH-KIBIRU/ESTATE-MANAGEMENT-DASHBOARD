import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableRow, Button, Alert } from '@mui/material';

function UnitList({ refresh }) {
  const [units, setUnits] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUnits = async () => {
      setError('');
      const { data, error } = await supabase
        .from('units')
        .select('id, unit_number, property_id, properties!fk_property(name)')
        .order('created_at', { ascending: false });
      console.log('Fetched units:', data);
      if (error) {
        console.error('Error fetching units:', error);
        setError(`Failed to load units: ${error.message}`);
      } else {
        setUnits(data || []);
      }
    };
    fetchUnits();
  }, [refresh]);

  const handleDelete = async (id) => {
    setError('');
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (error) {
      console.error('Error deleting unit:', error);
      setError(`Failed to delete unit: ${error.message}`);
    } else {
      setUnits(units.filter((unit) => unit.id !== id));
    }
  };

  return (
    <div>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Unit Number</TableCell>
            <TableCell>Property</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {units.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3}>No units found</TableCell>
            </TableRow>
          ) : (
            units.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell>{unit.unit_number}</TableCell>
                <TableCell>{unit.properties?.name || 'Unknown'}</TableCell>
                <TableCell>
                  <Button>Edit</Button>
                  <Button color="error" onClick={() => handleDelete(unit.id)}>
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

export default UnitList;
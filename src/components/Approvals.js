import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

function Approvals() {
  const [pendingPayments, setPendingPayments] = useState([]);

  useEffect(() => {
    const fetchPending = async () => {
      // Assuming 'payments' table has a 'status' field; add it to schema if needed
      const { data, error } = await supabase.from('payments').select('*').eq('status', 'pending');
      if (error) console.error('Error fetching pending payments:', error);
      else setPendingPayments(data);
    };
    fetchPending();
  }, []);

  const handleApprove = async (id) => {
    const { error } = await supabase.from('payments').update({ status: 'approved' }).eq('id', id);
    if (error) console.error('Error approving:', error);
    else setPendingPayments(pendingPayments.filter((p) => p.id !== id));
  };

  return (
    <div>
      <h2>Pending Approvals</h2>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Amount</TableCell>
            <TableCell>File</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pendingPayments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{payment.amount}</TableCell>
              <TableCell>{payment.file_path}</TableCell>
              <TableCell>
                <Button variant="contained" color="primary" onClick={() => handleApprove(payment.id)}>
                  Approve
                </Button>
                <Button color="error">Reject</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default Approvals;
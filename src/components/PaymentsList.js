// components/PaymentList.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Alert,
} from '@mui/material';
import jsPDF from 'jspdf';

const PaymentList = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        tenants!payments_tenant_id_fkey(name),
        properties!payments_property_id_fkey(name)
      `)
      .order('payment_date', { ascending: false });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setPayments(data || []);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const downloadReceipt = async (payment) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const startY = 20;

    // Fetch tenant and property names if not in payment object
    let tenantName = payment.tenants?.name || 'Unknown Tenant';
    let propertyName = payment.properties?.name || 'Unknown Property';
    if (!payment.tenants || !payment.properties) {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', payment.tenant_id)
        .single();
      const { data: propertyData } = await supabase
        .from('properties')
        .select('name')
        .eq('id', payment.property_id)
        .single();
      tenantName = tenantData?.name || 'Unknown Tenant';
      propertyName = propertyData?.name || 'Unknown Property';
    }

    // Receipt Number (4 characters, e.g., R001)
    const receiptNumber = `R${String(payment.id.slice(-3)).padStart(3, '0')}`;
    const currentDate = new Date().toLocaleString('en-US', { timeZone: 'EAT' }); // 09:15 PM EAT, September 25, 2025

    // Watermark - Simplified without rotation to avoid API issues
    doc.setTextColor(200, 200, 200); // Light gray for transparency
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    doc.text('ORIGINAL', pageWidth / 2, pageHeight / 2, { align: 'center' }); // Horizontal watermark in center

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 160, 133); // Teal color for branding
    doc.text('J.K Estate Management Ltd.', pageWidth / 2, startY, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('000-245 Nairobi Road, Nairobi, Kenya', pageWidth / 2, startY + 8, { align: 'center' });
    doc.text('Phone: +254 798 118 515 | Email: info@estatemgmt.co.ke', pageWidth / 2, startY + 14, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`Receipt #${receiptNumber}`, pageWidth / 2, startY + 24, { align: 'center' });
    doc.text(`Date: ${currentDate}`, pageWidth / 2, startY + 30, { align: 'center' });

    // Horizontal Line
    doc.setLineWidth(0.5);
    doc.setDrawColor(22, 160, 133);
    doc.line(margin, startY + 40, pageWidth - margin, startY + 40);

    // Payment Details Section
    let y = startY + 50;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Details', margin, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.text(`Tenant: ${tenantName}`, margin, y);
    y += 6;
    doc.text(`Property: ${propertyName}`, margin, y);
    y += 6;
    doc.text(`Amount: ${payment.amount.toFixed(2)} KES`, margin, y);
    y += 6;
    doc.text(`Payment Date: ${new Date(payment.payment_date).toLocaleDateString()}`, margin, y);
    y += 6;
    doc.text(`Method: ${payment.payment_method}`, margin, y);
    y += 6;
    doc.text(`Status: ${payment.status}`, margin, y);
    y += 6;
    doc.text(`Notes: ${payment.notes || 'N/A'}`, margin, y);
    y += 10;

    // Total Amount Highlight
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 160, 133);
    doc.text(`Total: ${payment.amount.toFixed(2)} KES`, pageWidth - margin, y, { align: 'right' });
    y += 10;

    // Footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(0, 0, 0);
    doc.text('Thank you for your business!', pageWidth / 2, y + 10, { align: 'center' });

    // Download the PDF
    doc.save(`receipt_${receiptNumber}.pdf`);
  };

  const handleRefresh = () => {
    fetchPayments();
  };

  if (loading) return <p>Loading payments...</p>;
  if (error) return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <h2>Payment List</h2>
        <Button variant="contained" onClick={handleRefresh}>
          Refresh
        </Button>
      </div>
      {payments.length === 0 ? (
        <Alert severity="info">No payments found</Alert>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Tenant</TableCell>
              <TableCell>Property</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Payment Date</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.id}</TableCell>
                <TableCell>{payment.tenants?.name || 'Unknown Tenant'}</TableCell>
                <TableCell>{payment.properties?.name || 'Unknown Property'}</TableCell>
                <TableCell>KES'{payment.amount.toFixed(2)}</TableCell>
                <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                <TableCell>{payment.payment_method}</TableCell>
                <TableCell>{payment.status}</TableCell>
                <TableCell>{payment.notes || 'N/A'}</TableCell>
                <TableCell>{new Date(payment.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <Button variant="contained" onClick={() => downloadReceipt(payment)} sx={{ mr: 1 }}>
                    Download Receipt
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default PaymentList;
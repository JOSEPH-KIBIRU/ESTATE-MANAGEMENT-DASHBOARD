import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Reports({ filter }) {
  const [paymentData, setPaymentData] = useState([]);

  useEffect(() => {
    const fetchPayments = async () => {
      let query = supabase.from('payments').select('*');
      if (filter) {
        // Example: filter by date range or property_id if passed
        if (filter.startDate && filter.endDate) {
          query = query
            .gte('created_at', filter.startDate)
            .lte('created_at', filter.endDate);
        }
      }
      const { data, error } = await query;
      if (error) console.error('Error fetching payments:', error);
      else setPaymentData(data);
    };
    fetchPayments();
  }, [filter]);

  // Aggregate payments by month
  const aggregatedData = paymentData.reduce((acc, payment) => {
    const month = new Date(payment.created_at).toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + payment.amount;
    return acc;
  }, {});

  const chartData = {
    labels: Object.keys(aggregatedData),
    datasets: [
      {
        label: 'Payments (KSH)',
        data: Object.values(aggregatedData),
        backgroundColor: ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#3F51B5'],
        borderColor: ['#1976D2', '#388E3C', '#F57C00', '#D32F2F', '#7B1FA2', '#303F9F'],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Monthly Payment Report',
      },
    },
  };

  return (
    <div>
      <h3>Payment Report</h3>
      {paymentData.length > 0 ? (
        <Bar data={chartData} options={options} />
      ) : (
        <p>No payment data available.</p>
      )}
    </div>
  );
}

export default Reports;
import PaymentUpload from '../components/PaymentUpload';
import Approvals from '../components/Approvals';
import PaymentsList from '../components/PaymentsList';

function Payments() {
  return (
    <div>
      <h2>Payments</h2>
      <PaymentUpload />
      <Approvals />
      <h3>All Payments</h3>
      <PaymentsList />
    </div>
  );
}

export default Payments;
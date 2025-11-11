// pages/TenantStatement.js
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/TenantStatement.css'

const TenantStatement = () => {
  const [properties, setProperties] = useState([])
  const [units, setUnits] = useState([])
  const [tenants, setTenants] = useState([])
  const [selectedProperty, setSelectedProperty] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [selectedTenant, setSelectedTenant] = useState('')
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [totalPaid, setTotalPaid] = useState(0)

  // Fetch properties on component mount
  useEffect(() => {
    fetchProperties()
  }, [])

  // Fetch units when property is selected
  useEffect(() => {
    if (selectedProperty) {
      fetchUnits(selectedProperty)
      setSelectedUnit('')
      setSelectedTenant('')
      setTenants([])
      setPayments([])
    }
  }, [selectedProperty])

  // Fetch tenants when unit is selected
  useEffect(() => {
    if (selectedUnit) {
      fetchTenants(selectedUnit)
      setSelectedTenant('')
      setPayments([])
    }
  }, [selectedUnit])

  // Fetch payments when tenant is selected
  useEffect(() => {
    if (selectedTenant) {
      fetchPayments(selectedTenant)
    }
  }, [selectedTenant])

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name')

      if (error) throw error
      console.log('Fetched properties:', data)
      setProperties(data || [])
    } catch (error) {
      console.error('Error fetching properties:', error)
    }
  }

  const fetchUnits = async (propertyId) => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('id, unit_number')
        .eq('property_id', propertyId)
        .order('unit_number')

      if (error) throw error
      console.log('Fetched units for property', propertyId, ':', data)
      setUnits(data || [])
    } catch (error) {
      console.error('Error fetching units:', error)
    }
  }

  const fetchTenants = async (unitId) => {
    try {
      console.log('Fetching tenants for unit:', unitId)
      
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, email, phone, unit_id')
        .eq('unit_id', unitId)
        // Remove the status filter to get all tenants, or adjust based on your needs
        .order('name')

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      console.log('Fetched tenants for unit', unitId, ':', data)
      setTenants(data || [])
      
      // If there's only one tenant, automatically select it
      if (data && data.length === 1) {
        console.log('Auto-selecting single tenant:', data[0].id)
        setSelectedTenant(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching tenants:', error)
      setTenants([])
    }
  }

  const fetchPayments = async (tenantId) => {
    setLoading(true)
    try {
      console.log('Fetching payments for tenant:', tenantId)
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('payment_date', { ascending: false })

      if (error) throw error
      
      console.log('Fetched payments for tenant', tenantId, ':', data)
      setPayments(data || [])
      
      // Calculate total paid
      const total = data?.reduce((sum, payment) => sum + payment.amount, 0) || 0
      setTotalPaid(total)
    } catch (error) {
      console.error('Error fetching payments:', error)
      setPayments([])
      setTotalPaid(0)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'kes'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getSelectedTenant = () => {
    return tenants.find(tenant => tenant.id === selectedTenant)
  }

  return (
    <div className="tenant-statement">
      <div className="page-header">
        <h1>Tenant Statement</h1>
        <p>View payment history and statements for tenants</p>
      </div>
      
      {/* Selection Forms */}
      <div className="selection-forms">
        <div className="form-group">
          <label>Select Property:</label>
          <select 
            value={selectedProperty} 
            onChange={(e) => setSelectedProperty(e.target.value)}
          >
            <option value="">Choose a property</option>
            {properties.map(property => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Select Unit:</label>
          <select 
            value={selectedUnit} 
            onChange={(e) => setSelectedUnit(e.target.value)}
            disabled={!selectedProperty}
          >
            <option value="">Choose a unit</option>
            {units.map(unit => (
              <option key={unit.id} value={unit.id}>
                Unit {unit.unit_number}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Select Tenant:</label>
          <select 
            value={selectedTenant} 
            onChange={(e) => setSelectedTenant(e.target.value)}
            disabled={!selectedUnit || tenants.length === 0}
          >
            <option value="">{tenants.length === 0 ? 'No tenants found' : 'Choose a tenant'}</option>
            {tenants.map(tenant => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
          {tenants.length === 0 && selectedUnit && (
            <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '5px' }}>
              No tenants registered for this unit
            </p>
          )}
        </div>
      </div>

      {/* Statement Display */}
      {selectedTenant && (
        <div className="statement-container">
          {loading ? (
            <div className="loading">Loading payments...</div>
          ) : (
            <>
              {/* Tenant Info */}
              <div className="tenant-info">
                <h3>Tenant Information</h3>
                {getSelectedTenant() && (
                  <div className="info-grid">
                    <div>
                      <strong>Name:</strong> {getSelectedTenant().name}
                    </div>
                    <div>
                      <strong>Email:</strong> {getSelectedTenant().email || 'N/A'}
                    </div>
                    <div>
                      <strong>Phone:</strong> {getSelectedTenant().phone || 'N/A'}
                    </div>
                    <div>
                      <strong>Total Paid:</strong> {formatCurrency(totalPaid)}
                    </div>
                    <div>
                      <strong>Total Payments:</strong> {payments.length}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div className="payment-history">
                <h3>Payment History</h3>
                {payments.length === 0 ? (
                  <p>No payment history found for this tenant.</p>
                ) : (
                  <div className="payments-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Payment Method</th>
                          <th>Reference</th>
                          <th>Status</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map(payment => (
                          <tr key={payment.id}>
                            <td>{formatDate(payment.payment_date)}</td>
                            <td>{formatCurrency(payment.amount)}</td>
                            <td>{payment.payment_method || 'N/A'}</td>
                            <td>{payment.reference_number || 'N/A'}</td>
                            <td>
                              <span className={`status ${payment.status || 'completed'}`}>
                                {payment.status || 'completed'}
                              </span>
                            </td>
                            <td>{payment.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="1"><strong>Total:</strong></td>
                          <td><strong>{formatCurrency(totalPaid)}</strong></td>
                          <td colSpan="4"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Export Button */}
              <div className="export-section">
                <button 
                  className="export-btn"
                  onClick={() => window.print()}
                >
                  Print Statement
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default TenantStatement

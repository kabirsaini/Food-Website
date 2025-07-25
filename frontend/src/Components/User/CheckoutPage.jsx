import '@/Components/User/Style/Checkout.css';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MiniPopup from './MiniPopup';

const CheckoutPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const cartItems = location.state?.cartItems || [];
    const total = location.state?.total || 0;

    const [savedAddress, setSavedAddress] = useState(null);
    const [formAddress, setFormAddress] = useState({
        street: '',
        city: '',
        state: '',
        pincode: ''
    });
    const [showForm, setShowForm] = useState(false);

    //User's saved address
    useEffect(() => {
        const fetchAddress = async () => {
            try {
                const res = await fetch('http://localhost:3000/api/users/getAddress', {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                const data = await res.json();
                if (res.ok && data.address && data.address.street) {
                    setSavedAddress(data.address);
                } else {
                    setShowForm(true); // no address found
                }
            } catch (err) {
                console.error('Failed to fetch address:', err);
                setShowForm(true); // fallback: show form
            }
        };

        fetchAddress();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormAddress(prev => ({ ...prev, [name]: value }));
    };

    // Save/update address
    const handleUpdate = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/users/saveAddress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(formAddress),
            });

            const data = await res.json();

            if (res.ok) {
                setSavedAddress(data.address);
                setShowForm(false);
            } else {
                alert(data.message || 'Failed to save address');
            }
        } catch (err) {
            console.error('Error saving address:', err);
            alert('Error saving address');
        }
    };

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js'; // hosted JS file provided by Razorpay to open the payment modal.
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayment = async () => {
        const res = await loadRazorpayScript();
        if (!res) {
            alert('Razorpay SDK failed to load');
            return;
        }

        const response = await fetch('http://localhost:3000/api/payments/createOrder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: total }),
        });

        const data = await response.json();

        const options = {
            key: 'rzp_test_M9UX3DjW2bBcA3',
            amount: data.amount,
            currency: 'INR',
            name: 'Gorato',
            description: 'Test Transaction',
            image: '/logo.png',
            order_id: data.id,
            handler: async function (response) {
                alert('Payment successful!');
                try {
                    const orderRes = await fetch('http://localhost:3000/api/orders', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    const result = await orderRes.json();

                    if (orderRes.ok) {
                        toast.success("Order placed successfully! ✅");
                        navigate('/SuccessPage');
                    } else {
                        alert(result.message || 'Failed to place order.');
                    }
                } catch (err) {
                    console.error("Error creating order:", err);
                    alert("Order creation failed.");
                }
            },
            prefill: {
                name: '', // optional
                email: '', // Optional
                contact: '', // Optional
            },
            notes: {
                address: `${savedAddress?.street}, ${savedAddress?.city}, ${savedAddress?.state}, ${savedAddress?.pincode}`
            },
            theme: {
                color: '#007bff',
            },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    return (
        <div className='Checkout'>
            <h3>Delivery Address</h3>

            {savedAddress ? (
                <>
                    <p>{savedAddress.street}, {savedAddress.city}</p>
                    <p>{savedAddress.state} - {savedAddress.pincode}</p>
                    <p
                        style={{ color: 'blue', cursor: 'pointer' }}
                        onClick={() => setShowForm(true)}
                    >
                        Change Address
                    </p>
                </>
            ) : (
                <p>Loading address...</p>
            )}

            {showForm && (
                <MiniPopup onClose={() => setShowForm(false)}>
                    <h4>{savedAddress ? 'Update Address' : 'Add Address'}</h4>
                    <input type="text" name="street" placeholder="Street" value={formAddress.street} onChange={handleChange} />
                    <input type="text" name="city" placeholder="City" value={formAddress.city} onChange={handleChange} />
                    <input type="text" name="state" placeholder="State" value={formAddress.state} onChange={handleChange} />
                    <input type="text" name="pincode" placeholder="Pincode" value={formAddress.pincode} onChange={handleChange} />
                    <button onClick={handleUpdate}>Save</button>
                </MiniPopup>
            )}

            <div className="payment">
                <h2>Select Payment Method</h2>
                <div className="payment-methods">
                    <div className="payment-method">
                        <button
                            onClick={handlePayment}
                            style={{
                                padding: '12px 18px',
                                backgroundColor: '#28a745',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Pay with Razorpay
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;

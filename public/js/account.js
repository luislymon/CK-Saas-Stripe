$(document).ready(function () {
  const publishableKey = 'pk_test_bOmkcP50oJs9F2B7EDfvTB2F00WkxIm6wk';
  const back_destination = 'http://localhost:3000';


  const stripe = Stripe(publishableKey);
  const checkoutButton = $('#checkout-button');
  const manageBillingButton = $('#manage-billing-button');
  const backDestination = $('#backDestination');

  backDestination.click(function(){
    location.href = back_destination;
  });

  checkoutButton.click(function () {
    const product = $("input[name='product']:checked").val();

    if(product){
      fetch('/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'id': customer.billingID
        },
        body: JSON.stringify({
          product,
          customerID: customer.billingID
        })
      })
        .then((result) => result.json())
        .then(({ sessionId }) => stripe.redirectToCheckout({ sessionId }));
    }
    
  })

  manageBillingButton.click(function () {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        email: customer.email
      },
      body: JSON.stringify({
        customer: customer.billingID
      })
    }

    fetch('/billing', requestOptions)
      .then((response) => response.json())
      .then((result) => window.location.replace(result.url))
      .catch((error) => console.log('error', error))
  })


})

require('dotenv').config()
require('./src/connect/mongodb')
const bodyParser = require('body-parser')
const express = require('express')
const session = require('express-session')
var MemoryStore = require('memorystore')(session)
const UserService = require('./src/user')
const Stripe = require('./src/connect/stripe')
const setCurrentUser = require('./src/middleware/setCurrentUser')
const hasPlan = require('./src/middleware/hasPlan')

const app = express()
app.use(session({
  saveUninitialized: false,
  cookie: { maxAge: 86400000 },
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  resave: false,
  secret: 'keyboard cat'
}))

app.use('/webhook', bodyParser.raw({ type: 'application/json' }))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.static('public'))
app.engine('html', require('ejs').renderFile)

const productToPriceMap = {
  premium: process.env.PRODUCT_PREMIUM,
  premium12: process.env.PRODUCT_PREMIUM_12
}

const intervalValueToText = {
  month: "mensual",
  year: "anual"
}

/**
pro: process.env.PRODUCT_PRO
 */
/*
app.get('/none', [setCurrentUser, hasPlan('none')], async function (req,res,next) {
  res.status(200).render('none.ejs')
})

app.get('/basic', [setCurrentUser, hasPlan('basic')], async function (req,res,next) {
  res.status(200).render('basic.ejs')
})

app.get('/pro', [setCurrentUser, hasPlan('pro')], async function (req,res,next) {
  res.status(200).render('pro.ejs')
})*/

app.get('/', async function (req, res) {
  res.render('login.ejs')
});


app.get('/account', async function (req, res) {
  let { _id } = req.session;
  let {interval} = req.session;

  //console.log("***"+interval);

  let customer = await UserService.getUserByUserId(_id);
  if (!customer) {
    console.log("No customer");
    res.redirect('/')
  } else {
    try {
      if(customer.billingId){
        let customerInfo = await Stripe.getCustomerByID(billingID);
        console.log("More customer data: " + customerInfo);
        
      }
      
    } catch (error) {
      console.log(error)
    }
    customer.interval = intervalValueToText[interval];
    res.render('account.ejs', { customer })

  }
})

app.get('/customerPortal/:id/:email/:name', async function (req, res) {
  
  const _id = req.params.id;
  const email = req.params.email;
  const name = req.params.name;
/*
  console.log('_id: '+_id);
  console.log('email: '+email);
  console.log('name: '+name);
*/
  //const { email } = req.body
  //console.log('email', email)

  //let customer = await UserService.getUserByEmail(email)
  let customer = await UserService.getUserByUserId(_id);
  let customerInfo = {}
  let subscriptionInfo = {}

  if (!customer) {
    //console.log(`email ${email} does not exist in Stripe. Making one. `)
    console.log(`id ${_id} does not exist. Something is wrong. `)
    
    //try {
      /*
      customerInfo = await Stripe.addNewCustomer(userId,email,name);

      customer = await UserService.addUser({
        userId: userId,
        email: customerInfo.email,
        billingID: customerInfo.id,
        plan: 'none',
        endDate: null
      })

      console.log(
        `A new user signed up and addded to DB. The ID for ${userId} is ${JSON.stringify(
          customerInfo
        )}`
      )

      console.log(`User also added to DB. Information from DB: ${customer}`)*/
    //} catch (e) {
      //console.log(e)
      //res.status(200).json({ e })
      //return*/
    //}
  } else {

    try {
      let billingID = customer.billingID;
      let subscriptionID = customer.subscription_id;
      if(!billingID){
        console.log(`id ${_id} does not exist in Stripe. Creating one. `);
        
        customerInfo = await Stripe.addNewCustomer(_id,email,name);
        billingID = customerInfo.id;
        
        console.log(billingID);

        customer = await UserService.updateUser({
          _id: _id,
          billingID: billingID,
          plan: 'none',
          endDate: null,
          subscription_id: null
        });
      }

      const isTrialExpired = customer.plan != 'none' && customer.endDate < new Date().getTime();

      if (isTrialExpired) {
        console.log('trial expired');
        //customer.hasTrial = false;
        //customer.save();
      } else {
        console.log(
          'no trial information',
          customer.hasTrial,
          customer.plan != 'none',
          customer.endDate < new Date().getTime()
        )
      }

      customerInfo = await Stripe.getCustomerByID(billingID);
      console.log(`The existing ID for ${_id} is ${JSON.stringify(customerInfo)}`);

      if(subscriptionID){
        let subscriptionInfo = await Stripe.getCustomerSubscription(subscriptionID);        
        req.session.interval = subscriptionInfo.plan.interval;
      }

     
      req.session._id = _id;

      //res.status(200).json(customerInfo);
      res.redirect('/account');

    } catch (error) {
      console.log(error);
      res.status(500).json({ error });
      return;
    }
  }

  

  // res.render('account.ejs', {
  //   customer,
  //   customerInfo,
  //   email
  // })

  //res.redirect('/account')
})

app.post('/checkout', setCurrentUser, async (req, res) => {

  //console.log("En checkout de app.js");

  const customer = req.user
  const { product, customerID } = req.body

  const price = productToPriceMap[product]

  try {
    const session = await Stripe.createCheckoutSession(customerID, price)

    const ms =
      new Date().getTime() + 1000 * 60 * 60 * 24 * process.env.TRIAL_DAYS
    const n = new Date(ms)

    //customer.plan = product
    //customer.hasTrial = true
    //customer.endDate = n
    //customer.save()

    res.send({
      sessionId: session.id
    })
  } catch (e) {
    console.log(e)
    res.status(400)
    return res.send({
      error: {
        message: e.message
      }
    })
  }
})

app.post('/billing', setCurrentUser, async (req, res) => {
  const { customer } = req.body
  console.log('customer', customer)

  const session = await Stripe.createBillingSession(customer)
  console.log('session', session)

  res.json({ url: session.url })
})

app.post('/webhook', async (req, res) => {
  let event

  try {
    event = Stripe.createWebhook(req.body, req.header('Stripe-Signature'))
  } catch (err) {
    console.log(err)
    return res.sendStatus(400)
  }

  const data = event.data.object

  console.log(event.type, data)
  switch (event.type) {
    case 'customer.created':
      console.log(JSON.stringify(data))
      break
    case 'invoice.paid':
      break
    case 'customer.subscription.created': {
      const user = await UserService.getUserByBillingID(data.customer)

      if (data.plan.id === process.env.PRODUCT_PREMIUM) {
        console.log('You are talking about premium product')
        user.plan = 'premium';        
        user.subscription_id= data.id;
      
      }

      if (data.plan.id === process.env.PRODUCT_PREMIUM_12) {
        console.log('You are talking about premium anual product')
        user.plan = 'premium';
        user.subscription_id= data.id;
      }

      /*
      if (data.plan.id === process.env.PRODUCT_PRO) {
        console.log('You are talking about pro product')
        user.plan = 'pro'
      }*/

      //user.hasTrial = true
      //user.endDate = new Date(data.current_period_end * 1000)

      await user.save()

      break
    }
    case 'customer.subscription.deleted': {
      const user = await UserService.getUserByBillingID(data.customer)

      user.plan = 'none'

      await user.save()

      break
    }
    case 'customer.subscription.updated': {
      // started trial
      const user = await UserService.getUserByBillingID(data.customer)

      if (data.plan.id == process.env.PRODUCT_PREMIUM) {
        console.log('You are talking about PREMIUM product')
        user.plan = 'premium'
      }

      if (data.plan.id === process.env.PRODUCT_PREMIUM_12) {
        console.log('You are talking about premium anual product')
        user.plan = 'premium'
      }
      /*

      if (data.plan.id === process.env.PRODUCT_PRO) {
        console.log('You are talking about pro product')
        user.plan = 'pro'
      }*/

      const isOnTrial = data.status === 'trialing'

      if (isOnTrial) {
        //user.hasTrial = true
        //user.endDate = new Date(data.current_period_end * 1000)
      } else if (data.status === 'active') {
        //user.hasTrial = false
        //user.endDate = new Date(data.current_period_end * 1000)
      }

      if (data.canceled_at) {
        // cancelled
        console.log('You just canceled the subscription' + data.canceled_at)
        user.plan = 'none'
        //user.hasTrial = false
        //user.endDate = null
      }
      console.log('actual', user.hasTrial, data.current_period_end, user.plan)

      await user.save()
      console.log('customer changed', JSON.stringify(data))
      break
    }
    default:
  }
  res.sendStatus(200)
})

const port = process.env.PORT || 4242

app.listen(port, () => console.log(`Listening on port ${port}!`))

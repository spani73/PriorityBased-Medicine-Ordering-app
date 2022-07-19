const Order = require('../../../models/order')
const moment = require('moment')
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)
const priority = require('./priority')
//console.log(Order.updateMany({},{$set:{priority:2}}))
function orderController () {
    return {
        store(req, res) {
            //increasing value by one everytime
            
            Order.find({common:"common"},(err,doc)=>{
                doc.forEach((d)=>{
                    let p = d.priority
                    p = p +1;
                    Order.updateOne({_id: d.id}, {$set:{priority: p }},(err,order)=>{
                        console.log("done updation ")
                    })
                })
                
            })
            let total = 0;
            let essen = 0;
            Object.keys(req.session.cart.items).forEach(function(key) {
                total++;
                console.log(req.session.cart.items[key].item.itemtype);
                if( req.session.cart.items[key].item.itemtype == "essen"){
                    essen++;
                }
            });
            let foundPriority = priority(essen,total);
            console.log(foundPriority);
            const { phone, address, stripeToken, paymentType } = req.body
            if(!phone || !address) {
                return res.status(422).json({ message : 'All fields are required' });
            }

            const order = new Order({
                customerId: req.user._id,
                items: req.session.cart.items,
                phone,
                address,
                priority: foundPriority
            })
            

            order.save().then(result => {
                Order.populate(result, { path: 'customerId' }, (err, placedOrder) => {
                    

                    //stripe payment
                    if(paymentType === 'card') {
                        stripe.charges.create({
                            amount: req.session.cart.totalPrice  * 100,
                            source: stripeToken,
                            currency: 'inr',
                            description: `Pizza order: ${placedOrder._id}`
                        }).then(() => {
                            placedOrder.paymentStatus = true
                            placedOrder.paymentType = paymentType
                            placedOrder.save().then((ord) => {
                                // Emit
                                const eventEmitter = req.app.get('eventEmitter')
                                eventEmitter.emit('orderPlaced', ord)
                                delete req.session.cart
                                return res.json({ message : 'Payment successful, Order placed successfully' });
                            }).catch((err) => {
                                console.log(err)
                            })

                        }).catch((err) => {
                            delete req.session.cart
                            return res.json({ message : 'OrderPlaced but payment failed, You can pay at delivery time' });
                        })
                    } else {
                        delete req.session.cart
                        return res.json({ message : 'Order placed succesfully' });
                    }
                })
            }).catch(err => {
                return res.status(500).json({ message : 'Something went wrong' });
            })
        },
        async index(req, res) {
            const orders = await Order.find({ customerId: req.user._id },
                null,
                { sort: { 'createdAt': -1 } } )
            res.header('Cache-Control', 'no-store')
            res.render('customers/orders', { orders: orders, moment: moment })
        },
        async show(req, res) {
            const order = await Order.findById(req.params.id)
            // Authorize user
            if(req.user._id.toString() === order.customerId.toString()) {
                return res.render('customers/singleOrder', { order })
            }
            return  res.redirect('/')
        }
    }
}

module.exports = orderController
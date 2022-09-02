const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

//
// mongoDB 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zv0zn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//JSON Web Token
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.send(401).send({ message: 'UnAuthorized Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next();
    })
};

async function run() {
    try {
        await client.connect();
        const articleCollection = client.db('article-publishing').collection('articles');
        const premiumArticleCollection = client.db('article-publishing').collection('premiumArticle');
        const userNewCollection = client.db('NewAllUser').collection('NewAll');
        const userCommentCollection = client.db('article-publishing-comment').collection('allComment');
        const paymentCollection = client.db("article-publishing").collection("payments");
        const premiumUserColl = client.db("article-publishing").collection("premiumUser");

        console.log("database Conneted")

        //admin verify verifyAdmin
        // const verifyAdmin = async (req, res, next) => {
        //     const requester = req.decoded.email;
        //     const requesterAccount = await userNewCollection.findOne({ email: requester });
        //     if (requesterAccount.role === 'admin') {
        //         next();
        //     }
        //     else {
        //         res.status(403).send({ message: 'Forbidden Access' });
        //     }
        // };

        //get all user
        app.get('/allUser', async (req, res) => {
            const users = await userNewCollection.find({}).toArray();
            res.send(users);
        });

        // Get admin user
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userNewCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
        });

        // //Make admin
        app.put('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userNewCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // delete user
        app.delete('/user/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await userNewCollection.deleteOne(query);
            res.send(result);
        })

        //user email send with jwt token
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userNewCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ result, token });
        });

        // current user 
        app.get('/user/:currentUser', verifyJWT, async (req, res) => {
            const email = req.params.currentUser;
            const query = { email: email }
            const users = await userNewCollection.findOne(query);
            res.send(users);
        });

        //get all article
        //get all article
        app.get('/article', async (req, res) => {
            const result = await articleCollection.find({}).toArray();
            res.send(result);
        });


        //get all premiumArticle
        app.get('/premium-article', async (req, res) => {
            const query = {};
            const cursor = premiumArticleCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        //get premium single article
        app.get('/premiumSingleArticle/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await premiumArticleCollection.findOne(filter);
            res.send(result);
        });


        //get single article user email api
        app.get('/article/:email', async (req, res) => {
            const email = req.params.email;
            const result = await articleCollection.find({ userEmail: email }).toArray();
            res.send(result);
        });

        // get single article id
        app.get('/singleArticle/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await articleCollection.findOne(filter);
            res.send(result);
        });


        // delete single article id  delete
        app.delete('/article/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await articleCollection.deleteOne(query);
            res.send(result);
        })

        // delete single article id  delete
        app.delete('/article/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await userNewCollection.deleteOne(query);
            res.send(result);
        })

        //post article
        app.post('/article', async (req, res) => {
            const article = req.body;
            const result = await articleCollection.insertOne(article);
            res.send(result);
        });

        //post comment
        app.post('/doComment', async (req, res) => {
            const commentData = req.body;
            const result = await userCommentCollection.insertOne(commentData);
            res.send(result);
        })


        //Post Base Comment Filter
        app.get('/filterCommnet/:id', async (req, res) => {
            const id = req.params.id;
            const postId = { postId: id }
            const result = await userCommentCollection.find(postId).toArray();
            res.send(result);
        })

        //payment post api
        app.post('/create-payment-intent', async (req, res) => {
            const article = req.body;
            const price = article.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        });

        //payment confirm
        app.patch('/user/:email', verifyJWT, async (req, res) => {
            const payment = req.body;
            const filter = { email: req.params.email };
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment);
            const updatedUser = await premiumUserColl.updateOne(filter, updateDoc);
            res.send(updateDoc);
        })

        //Paid user 
        app.get('/paidUser', async (req, res) => {
            // const filter = { paid: true };
            const result = await paymentCollection.find({}).toArray();
            res.send(result);
        });

    }
    finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello From Article Publishing Website Server')
})

app.listen(port, () => {
    console.log(`Article Publishing Website listening on port ${port}`)
})
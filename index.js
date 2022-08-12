const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

//midleware
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
        const userCollection = client.db('article-publishing').collection('users');

        //admin verify verifyAdmin
        // const verifyAdmin = async (req, res, next) => {
        //     const requester = req.decoded.email;
        //     const requesterAccount = await userCollection.findOne({ email: requester });
        //     if (requesterAccount.role === 'admin') {
        //         next();
        //     }
        //     else {
        //         res.status(403).send({ message: 'Forbidden Access' });
        //     }
        // };

        //get all user
        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        // //get writter
        // app.get('/user', verifyJWT, async (req, res) => {
        //     const users = await userCollection.find().toArray();
        //     res.send(users);
        // });

        //get admin
        // app.get('/admin/:email', async (req, res) => {
        //     const email = req.params.email;
        //     const user = await userCollection.findOne({ email: email });
        //     const isAdmin = user.role === 'admin';
        //     res.send({ admin: isAdmin });
        // });

        // //make admin
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        //user email send with jwt token
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ result, token });
        });

        app.put('/user/:currentUser', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ result, token });
        });

        // cruent user 
        app.get('/user/:currentUser', verifyJWT, async (req, res) => {
            const email = req.params.currentUser;
            const query = { email: email }
            const users = await userCollection.findOne(query);
            res.send(users);
        });

        //get all article
        app.get('/article', async (req, res) => {
            const query = {};
            const cursor = articleCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        //get single article user email api
        // app.get('/article/:email', async (req, res) => {
        //     const email = req.params.email;
        //     const result = await articleCollection.find({ userEmail: email }).toArray();
        //     res.send(result);
        // });

        // // get single article id
        app.get('/article/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await articleCollection.findOne(query);
            res.send(result);
        });


        // delete single article id  delete
        app.delete('/article/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await articleCollection.deleteOne(query);
            res.send(result);
        })






        //post article
        app.post('/article', async (req, res) => {
            const article = req.body;
            const result = await articleCollection.insertOne(article);
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
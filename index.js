const express = require('express');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const { JsonWebTokenError } = require('jsonwebtoken');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.4cojmrb.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const bistroDb = client.db("bistro").collection("menus");
    const cartCollection = client.db("bistro").collection("carts");
    const userCollection = client.db("bistro").collection("uers");

    // jwt token api
    app.post('/jwt', async(req, res)=>{
      const user =req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      });
      res.send({token});
    })
 
    // middelware jwt.verify
    const verifyToken =(req, res, next)=>{
      if(!req.headers.authorization){
        return res.status(401).send({message: 'forbaiden access'})
      }
      const token =req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
          if(err){
            return res.status(401).send({message: 'forbaiden access'})
          }
          req.decoded =decoded;
          next();
      })

      
    }
    // veryfy admin
    const verifyAdmin = async(req, res, next)=>{
      const email =req.decoded.email;
      const query ={email: email};
      const user =await userCollection.findOne(query);
      const isAdmin =user?.role === 'admin';
      if(!isAdmin){
        return res.status(401).send({message: 'forbaiden access'})
      }
      next();
    }
app.get("/menus", async(req, res)=>{
    const result= await bistroDb.find().toArray();
    res.send(result);
})

app.get("/updated/:id", async(req, res)=>{
  const id =req.params.id;
  const query ={_id: new ObjectId(id)};
  const result =await bistroDb.findOne(query);
  console.log(result);
  res.send(result);
})

app.post("/menus", verifyToken, verifyAdmin, async(req, res)=>{
  const item =req.body;
  const result =await bistroDb.insertOne(item);
  res.send(result);
})

app.delete("/menus/:id", verifyToken, verifyAdmin, async(req, res)=>{
  const id =req.params.id;
  const query ={_id: new ObjectId(id)};
  const result =await bistroDb.deleteOne(query);
  res.send(result);
})

app.post("/carts", async(req, res)=>{
      const cartItem=req.body;
      const result =await cartCollection.insertOne(cartItem);
      res.send(result);
})

app.get("/carts", async(req, res)=>{
  const email =req.query.email;
  console.log(email);
  const query ={email: email};
  const result = await cartCollection.find(query).toArray();
  res.send(result);
})

app.delete("/carts/:id", async(req, res)=>{
  const id =req.params.id;
  const query ={_id: new ObjectId(id)};
  const result =await cartCollection.deleteOne(query);
  res.send(result);
})

// user api
app.post("/user", async(req, res)=>{
  const user =req.body;
  const query ={email: user.email};
  const existingEmail =await userCollection.findOne(query);
  if(existingEmail){
    return res.send({ message: 'user already exist', insertedId:null});
  }
  const result =await userCollection.insertOne(user);
  res.send(result);
})

app.get("/users", verifyToken, verifyAdmin, async(req, res)=>{
 const result= await userCollection.find().toArray();
  res.send(result);
})

app.delete("/users/:id", verifyToken, verifyAdmin, async(req, res)=>{
  const id =req.params.id;
  const query ={_id: new ObjectId(id)};
  const result =await userCollection.deleteOne(query);
  res.send(result);
})

// admin role api

app.patch("/users/admin/:id", verifyToken, verifyAdmin, async(req, res)=>{
  const id =req.params.id;
  const filter ={_id: new ObjectId(id)};
  const updateDoc ={
    $set: {
      role: 'admin'
    }
  }
  const result =await userCollection.updateOne(filter, updateDoc);
  res.send(result);
})

app.get('/users/admin/:email', verifyToken, async(req, res)=>{
  const email=req.params.email;
  if(email !== req.decoded.email){
    return res.status(403).send({message: 'forbaidden access'});
  }
  const query ={email: email};
  const user =await userCollection.findOne(query);
  let admin =false;
  if(user){
    admin =user?.role === 'admin';
  }
  res.send({ admin });
})
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello server!');
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
})
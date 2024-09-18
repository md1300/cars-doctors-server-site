const express=require('express')
const cors=require('cors')
const jwt = require('jsonwebtoken');
const cookieParser=require('cookie-parser')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app=express()
const port=process.env.PORT || 5000 ;

// midleware---------------
 app.use(cors({
  origin: ['http://localhost:5173'],
  credentials:true
 }))
 app.use(express.json());
 app.use(cookieParser());

 app.get('/',(req,res)=>{
    res.send('Doctor server is running')
 })

// console.log(process.env.DB_USER)

// middlesWares -----------------------

const logger=async(req,res,next)=>{
  console.log('called',req.host,req.originalUrl);
  next()
};

const veryfyToken=async(req,res,next)=>{
  const token=req.cookies?.token ;
  console.log('value of token in middleWare',token)
  if(!token){
    return res.status(401).send({message:'not authorized'})
  }
 jwt.verify(token,process.env.JWT_ACCESS_TOKEN,(err,decoded)=>{
  // err
  if(err){
    return res.status(401).send({message:'unAuthorized'})
  }
  // if token is valid then it would be decoded
  console.log('value in the token ',decoded)
  req.user=decoded ;
  next()
 })
  

  
}

 const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vmhty.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
 
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

     const serviceCollection=client.db("carsDoctor").collection("services");

     const bookingCollection=client.db("carsDoctor").collection("booking")
    //  ---------------Auth related api ----------------
   app.post('/jwt',logger ,async(req,res)=>{
    const user=req.body;
    console.log(user)
    const token=jwt.sign(user,process.env.JWT_ACCESS_TOKEN,{expiresIn:'1h'})
    res
    .cookie('token',token,{
      httpOnly:true,
      secure:false,
      
    })
    .send({success:true})
  })
// -------------------services related api -------------------------
     app.get('/services',logger, async(req,res)=>{
        const cursor=serviceCollection.find()
        const result=await cursor.toArray()
        res.send(result)
     })

     app.get('/services/:id',async(req,res)=>{
        const id=req.params.id ;
        const query={_id:new ObjectId(id)}
        const options = {
            
            // Include only the `title` and `imdb` fields in the returned document
            projection: {  title: 1, price: 1,service_id:1,img:1 },
          };
          const result=await serviceCollection.findOne(query,options)
          res.send(result)
     })

    //  ------------- booking operation ------------------
  app.get('/bookings',logger,veryfyToken, async(req,res)=>{
    console.log(req.query.email)
    // console.log('tok tok token', req.cookies.token)
    console.log("user in the valid token",req.user)
    let query={}
    if(req.query.email){
      query={email:req.query.email}
    }
    const result=await bookingCollection.find(query).toArray()
    res.send(result)
  })

    app.post('/bookings',async(req,res)=>{
      const booking=req.body ;
      console.log(booking)
      const result=await bookingCollection.insertOne(booking) ;
      res.send(result);
    })

    app.patch('/bookings/:id',async(req,res)=>{
      const id=req.params.id ;
      const filter={_id:new ObjectId(id)}
      const updatedBooking=req.body
      console.log(updatedBooking)
      const updateDoc = {
        $set: {
          status:updatedBooking.status,
 
        },
      };
      const result=await bookingCollection.updateOne(filter,updateDoc)
      res.send(result)
    })



    app.delete('/bookings/:id',async(req,res)=>{
      const id=req.params.id ;
      const query={_id:new ObjectId(id)}
      const result=await bookingCollection.deleteOne(query)
      res.send(result)
     })

     // Send a ping to confirm a successful connection
     await client.db("admin").command({ ping: 1 });
     console.log("Pinged your deployment. You successfully connected to MongoDB!");
   } finally {
     // Ensures that the client will close when you finish/error
    //  await client.close();
   }
 }
 run().catch(console.dir);
 

 app.listen(port,()=>{
    console.log(`Doctor server site is running ${port}`)
})
 
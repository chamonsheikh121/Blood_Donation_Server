const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const port = 5000

//MIDDLEWARE

app.use(cors());
app.use(express.json())


const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.hxgtknm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    await client.connect();
    const mongodb = client.db('Blood-Donation')
    const usersCollection = mongodb.collection('All-users')
    const requestCollection = mongodb.collection('All-requests')
    const acceptedCollection = mongodb.collection('All-accepted')
    const messageCollection = mongodb.collection('messages')


    // ======================= user verification ================================

    app.post('/api/v1/jwt', async (req, res) => {
      const userEmail = req?.body;
      // console.log(userEmail);
      const token = jwt.sign({ userEmail }, process.env.Secret_Key, { expiresIn: '10h' });
      res.send({ token: token })
    })
    const verifyToken = (req, res, next) => {
      const requestToken = req?.headers?.authentication;

      if (!requestToken) {
        return res.status(401).send({ message: 'Unauthorized user' })
      }
      const token = requestToken.split(' ')[1]
      jwt.verify(token, process.env.Secret_Key, (err, decode) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized user' })
        }
        res.decoded = decode
        next()
      })

    }
    const adminVerify = async (req, res, next) => {
      const email = res?.decoded?.userEmail?.email
      const filter = { donarEmail: email };
      const user = await usersCollection.findOne(filter);
      const isAdmin = user?.userRole === 'admin';
      console.log(isAdmin);
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next()
    }
    const volunteerVerify = async (req, res, next) => {
      const email = res?.decoded?.userEmail?.email
      const filter = { donarEmail: email };
      const user = await usersCollection.findOne(filter);
      const isAdmin = user?.userRole === 'volunteer';
      console.log(isAdmin);
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next()
    }



    // =========================== all data api ======================================

    app.post('/api/v1/all-users', async (req, res) => {
      const userDetails = req?.body;
      const RegisteredCount = await usersCollection.countDocuments()
      for (var i = 0; i < RegisteredCount; i++) {
        const userId = Math.floor(Math.random() * 90000000) + 10000000;
        const filter = { userUID: userId }
        const RegisteredUser = await usersCollection.findOne(filter)
        if (RegisteredUser === null) {
          userDetails.userUID = userId;
          const result = await usersCollection.insertOne(userDetails);
          res.send(result);
          break;
        }
      }


    })
    app.delete('/api/v1/delete-user', verifyToken, adminVerify, async (req, res) => {
      const email = req?.query.email;
      const filter = { donarEmail: email };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    })
    app.patch('/api/v1/userRole', verifyToken, adminVerify, async (req, res) => {
      const body = req.body;
      const filter = { donarEmail: body?.email }
      const doc = {
        $set: {
          userRole: body?.userRole
        }
      }
      const result = await usersCollection.updateOne(filter, doc);
      res.send(result)
    })
    app.patch('/api/v1/userStatus', verifyToken, adminVerify, async (req, res) => {
      const body = req.body;
      const filter = { donarEmail: body?.email }
      const doc = {
        $set: {
          status: body?.userStatus
        }
      }
      const result = await usersCollection.updateOne(filter, doc);
      res.send(result)
    })
    app.get('/api/v1/all-users', verifyToken, async (req, res) => {
      const result = await usersCollection.find().sort({ _id: -1 }).toArray();
      res.send(result)
    })
    app.get('/api/v1/user/:value', verifyToken, async (req, res) => {
      const idOrEmail = req?.params?.value;
      const email = idOrEmail.includes('@');
      if (email) {
        const filter = { donarEmail: idOrEmail };
        const result = await usersCollection.findOne(filter);
        res.send(result)
        return;
      }
      else {
        const userID = parseInt(idOrEmail)
        // console.log(userID, typeof (userID));
        const filterUID = { userUID: userID }
        const resultUID = await usersCollection.findOne(filterUID)
        res.send(resultUID)
      }

    })
    app.get('/api/v1/find-user', async (req, res) => {
      const email = req?.query?.email
      // console.log('email', email);
      const filter = { donarEmail: email };
      const result = await usersCollection.findOne(filter);
      // console.log(result);
      res.send(result)
    })
    app.get('/api/v1/user-search/:uid', async (req, res) => {
      const uid = req?.params?.uid;
      const uidNumber = parseInt(uid)
      const filter = { userUID: uidNumber };
      let result = await usersCollection.findOne(filter);
      res.send(result)
    })
    app.patch('/api/v1/user-profile', async (req, res) => {
      const data = req.body;
      // console.log(data);
      const filter = { donarEmail: data?.donarEmail }
      if (data?.count) {
        const updateDoc = {
          $set: {
            profileUpdateStatus: data?.count,
            emailVerify: data?.emailVerify
          }
        }
        const result = await usersCollection.updateOne(filter, updateDoc)
        res.send(result)
        return
      }
      else {
        // console.log('profile');
        const updateDoc = {
          $set: {
            status: data?.status,
            donarName: data?.donarName,
            donarImage: data?.donarImage,
            donarPhone: data?.donarPhone,
            healthStatus: data?.healthStatus,
            recentTravelHistory: data?.recentTravelHistory,
            weight: data?.weight,
            lastDonation: data?.lastDonation,
            medication: data?.medication,
            dateOfBirth: data?.dateOfBirth,
            BloodGroup: data?.BloodGroup,
            Division: data?.Division,
            District: data?.District,
            Upazila: data?.Upazila

          }
        }
        const result = await usersCollection.updateOne(filter, updateDoc)
        res.send(result)
      }

    })
    app.post('/api/v1/all-request', async (req, res) => {
      const requestedInfo = req.body;
      const requested = await requestCollection.find().toArray();
      if (requested?.length >= 0) {
        const serialNumber = requested?.length + 1;
        requestedInfo.serialNumber = serialNumber;
      }
      const result = await requestCollection.insertOne(requestedInfo);
      res.send(result)

    })
    app.delete('/app/v1/delete-request', verifyToken, adminVerify, async (req, res) => {
      const id = req?.query?.id;
      const filter = { _id: new ObjectId(id) };
      const result = await requestCollection.deleteOne(filter);
      const anotherFilter = { requestedId: id };
      const result1 = await acceptedCollection.deleteOne(anotherFilter)
      res.send(result)
    })
    app.post('/api/v1/all-acceptedRequest', async (req, res) => {
      try {
        const AcceptedUserDetails = req?.body;
        const id = AcceptedUserDetails?.requestedId
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            status: 'accepted'
          }
        }
        const result1 = await requestCollection.updateOne(filter, updateDoc)
        const result2 = await acceptedCollection.insertOne(AcceptedUserDetails);
        res.send(result2);
      }
      catch (err) {
        console.log(err);
      }
    })
    app.get('/api/v1/my-acceptation/:email', async (req, res) => {
      const email = req?.params?.email
      const filter = { "acceptedUserDetails.accepterEmail": email };
      const result = await acceptedCollection.find(filter).sort({ _id: -1 }).toArray();
      res.send(result)
    })
    app.get('/api/v1/accepter-details/:email', async (req, res) => {
      const email = req?.params?.email
      const filter = { donarEmail: email };
      const result = await acceptedCollection.find(filter).sort({ _id: -1 }).toArray();
      res.send(result)
    })
    app.patch('/api/v1/acceptedRequests/:id', async (req, res) => {
      const id = req?.params?.id;
      const filter = { requestedId: id }
      const updateDoc = {
        $set: {
          status: 'fullFilled'
        }
      }
      const result = await acceptedCollection.updateOne(filter, updateDoc);
      res.send(result)
    })
    app.get('/api/v1/my-requests/:email', async (req, res) => {
      const email = req?.params?.email;
      const filter = { donarEmail: email };
      const result = await requestCollection.find(filter).toArray();
      res.send(result)
    })


    // =============================== find one request ========================
    app.get('/api/v1/findOne/:value', async (req, res) => {
      try {

        const idOrSerialNumber = req?.params?.value
        if (/^\d+$/.test(idOrSerialNumber)) {
          const serialNumber = parseInt(idOrSerialNumber);
          const filter = { serialNumber: serialNumber }
          const resultSerial = await requestCollection.findOne(filter);
          console.log(idOrSerialNumber);
          res.send(resultSerial)
          return;
        }
        else if (/^[a-fA-F0-9]{24}$/.test(idOrSerialNumber)) {
          const filter = { _id: new ObjectId(idOrSerialNumber) };
          const result = await requestCollection.findOne(filter);
          console.log(filter, result);
          res.send(result)
          return
        }
        else {
          res.send(null)
        }
      }
      catch (err) {
        console.log(err);
      }
    })
    app.get('/api/v1/all-request-count', async (req, res) => {
      const filter = { status: 'active' }
      const count = await requestCollection.countDocuments(filter);
      // console.log(count);
      const result = await requestCollection.find(filter).sort({ _id: -1 }).toArray()
      // console.log(result);
      res.send({ count: count, data: result })
    })
    app.get('/api/v1/pending', async (req, res) => {
      const filter = { status: 'pending' }
      const count = await requestCollection.countDocuments(filter);
      const result = await requestCollection.find(filter).sort({ _id: -1 }).toArray();
      res.send(result)
    })

    app.patch('/api/v1/update-request', async (req, res) => {
      const data = req?.body;
      const id = data?.requestId
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          requesterName: data?.requesterName,
          requestedBloodGroup: data?.requestedBloodGroup,
          requesterDivision: data?.requesterDivision,
          requesterDistrict: data?.requesterDistrict,
          requesterUpazila: data?.requesterUpazila,
          requesterHospital: data?.requesterHospital,
          requestedDate: data?.requestedDate,
          requestedTime: data?.requestedTime,
          requesterPhone: data?.requesterPhone,
          requesterFullAddress: data?.requesterFullAddress,
          requesterMessage: data?.requesterMessage,
          ...(data?.requesterImage && { requesterImage: data?.requesterImage })
        }
      }
      const result = await requestCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    app.patch('/api/v1/update-request-status', verifyToken, async (req, res) => {
      const id = req?.query?.id
      const filter = { _id: new ObjectId(id) };
      const data = await requestCollection.findOne(filter);
      let activeStatus;
      if (data?.status == 'active') {
        activeStatus = 'pending'
      }
      else {
        activeStatus = 'active'
      }
      const doc = {
        $set: {
          status: activeStatus
        }
      }
      const result = await requestCollection.updateOne(filter, doc);
      res.send(result)
    })

    app.patch('/api/v1/profile-message-count', async (req, res) => {
      const email = req?.query?.email;
      const filter = { donarEmail: email };
      const updateDoc = {
        $set: {
          messageCount: 0
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
    })

    app.get('/api/v1/message', async (req, res) => {
      const email = req?.query?.email;
      const filter = { email: email };
      console.log(filter);
      const result = await messageCollection.find(filter).sort({ _id: -1 }).toArray();
      res.send(result)
    })
    app.post('/api/v1/post-message', verifyToken, async (req, res) => {
      const message = req?.body;
      console.log(message);
      const filter = { donarEmail: message?.email }
      const profile = await usersCollection.findOne(filter)
      const doc = {
        $set: {
          messageCount: profile?.messageCount + 1
        }
      }
      await usersCollection.updateOne(filter, doc)
      const result = await messageCollection.insertOne(message);
      res.send(result)
    })
    app.patch('/api/v1/update-message', verifyToken, async (req, res) => {
      const id = req?.query?.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'checked'
        }
      }
      const result = await messageCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Blood donation running on port ${port}`)
})


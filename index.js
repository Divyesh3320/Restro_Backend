const express=require('express');
const mongoose=require('mongoose');
const {menue,users,foods,booking,reviews,siteConfig,gallery,sliderImage,eventImages,foodRatings}=require('./schemasmodel');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { oauth2client } = require('./googleConfig.js');
const { default: axios } = require('axios');  
const path = require("path");
const fse = require("fs-extra");
const multer=require("multer")
const env = require("dotenv").config();

// Prevent server crash from unhandled promise rejections (e.g. duplicate key index build)
process.on('unhandledRejection', (reason) => {
    console.warn('⚠️  Unhandled Rejection (server continues running):', reason?.message || reason);
});


mongoose.connect(process.env.mongodbConnectionString,{useNewUrlParser:true}).then(async ()=>{
    console.log("connected mongoose atlas");

    // Drop legacy students collection if it exists
    try {
        const collections = await mongoose.connection.db.listCollections({ name: 'students' }).toArray();
        if (collections.length > 0) {
            await mongoose.connection.db.dropCollection('students');
            console.log('🗑️  students collection dropped');
        }
    } catch(e) { /* ignore */ }

    const express=require('express');

    const app =express();

    const upload = multer({ dest: "uploads/" });
    app.use(cors({
        origin: 'http://localhost:3000', // React frontend origin
        credentials: true  // Enable credentials (to send/receive cookies)
      }));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(express.json());
    app.use(cookieParser());
    // Serve uploaded files statically
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
   


    // ---- get data in fronted for menue and foodlists---

    app.get('/menue',async(req,res)=>{
       const menuedata = await menue.find();

       res.send(menuedata);
    })

    app.get('/foods', async (req, res) => {
        try {
            const allFoods = await foods.find();
            // Aggregate ratings for all foods
            const ratingAgg = await foodRatings.aggregate([
                { $group: { _id: '$foodId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
            ]);
            const ratingMap = {};
            ratingAgg.forEach(r => { ratingMap[r._id.toString()] = { avg: r.avg, count: r.count }; });

            // Count likes per food from users collection
            const allUsers = await users.find({ likes: { $exists: true, $ne: [] } }, { likes: 1 });
            const likeMap = {};
            allUsers.forEach(u => {
                (u.likes || []).forEach(fid => {
                    const key = fid.toString();
                    likeMap[key] = (likeMap[key] || 0) + 1;
                });
            });

            const result = allFoods.map(f => {
                const stats = ratingMap[f._id.toString()] || { avg: 0, count: 0 };
                return {
                    ...f.toObject(),
                    avgUserRating: Math.round(stats.avg * 10) / 10,
                    ratingCount: stats.count,
                    likeCount: likeMap[f._id.toString()] || 0
                };
            });
            res.json(result);
        } catch(error) {
            res.status(500).json({ message: 'Failed to get foods', error });
        }
    })

       // ---for admin pannel menue part---

    // app.post('/menue', async (req, res) => {

    //     // console.log(req.body)
        
    //     const mdata = new menue({
    //         name:req.body.name,
    //         img:req.body.img
    //     }) 
    
    //     const savedManue = await mdata.save();
    //     res.json(savedManue);
    // });

    app.post("/menue", async (req, res) => {
      try {
        // Define the target path
        // const targetDir = path.join(__dirname, "../food-web/public/assets/menue/typeoffood/");
        // const targetPath = path.join(targetDir, req.file.originalname);
    
    
        // // Ensure the directory exists
        // await fse.ensureDir(targetDir);
    
        // // Move the file to the target directory
        // await fse.move(req.file.path, targetPath, { overwrite: true });
    
        // // Create the relative path to save in the database
        // const relativePath = `./assets/menue/typeoffood/${req.file.originalname}`;
    
        // Save the menu data to MongoDB
        console.log("url",req.body.name)
        const mdata = new menue({
          name: req.body.name,
          img: req.body.img,
        });
    
        const savedMenu = await mdata.save();
        res.status(201).json(savedMenu);
      } catch (error) {
        console.error("Error uploading image:", error);
        res.status(500).json({ message: "Failed to upload image", error });
      }
    });

    app.delete('/menue/:id',async(req,res)=>{
        const mdata = await menue.findById(req.params.id);
        await mdata.deleteOne();
        res.send(mdata)
    })

    // const fs = require("fs").promises; // Import file system module for promises

// app.delete('/menue/:id', async (req, res) => {
//   try {
//     // Find the menu entry by ID
//     const mdata = await menue.findById(req.params.id);
//     if (!mdata) {
//       return res.status(404).json({ message: "Menu item not found" });
//     }

//     // Define the absolute file path
//     const filePath = path.join(__dirname, "../food-web/public", mdata.img);

//     // Attempt to delete the file if it exists
//     try {
//       await fse.unlink(filePath);
//       console.log(`File deleted: ${filePath}`);
//     } catch (err) {
//       console.error(`Error deleting file: ${filePath}`, err);
//       // Optionally, you can still proceed to delete the database record even if the file is missing
//     }

//     // Delete the menu entry from the database
//     await mdata.deleteOne();

//     // Send response
//     res.status(200).json({ message: "Menu item and file deleted", data: mdata });
//   } catch (error) {
//     console.error("Error deleting menu item:", error);
//     res.status(500).json({ message: "Failed to delete menu item", error });
//   }
// });


    app.get('/menue/:id',async(req,res)=>{
        const mdata = await menue.findById({_id:req.params.id});
 
        res.send(mdata)
     })


     app.put("/menue/:id", async (req, res) => {
      try {
        const { name, img } = req.body; // Parse form data fields
        const mdata = await menue.findById(req.params.id);
    
        if (!mdata) {
          return res.status(404).json({ message: "Menu item not found" });
        }
    
        // Check if a new file is uploaded
    
        // Update the database record
        mdata.name = name;
        mdata.img = img;
        const updatedMdata = await mdata.save();
    
        res.status(200).json(updatedMdata);
      } catch (error) {
        console.error("Error updating menu item:", error);
        res.status(500).json({ message: "Failed to update menu item", error });
      }
    });
    

    //  app.put('/menue/:id',async(req,res)=>{
    //     const mdata = await menue.findById({_id:req.params.id});

    //     mdata.name=req.body.name;
    //     mdata.img=req.body.img;

    //     await mdata.save();
        
    //     res.send(mdata);
    //  })


        // ---for admin pannel foods part---

    //  app.post('/foods', async (req, res) => {

    //     console.log(req.body)
        
    //     const fdata = new foods({
    //         name:req.body.name,
    //         img:req.body.img,
    //         price:req.body.price,
    //         type:req.body.type
    //     }) 
    
    //     const savedFoods = await fdata.save();
    //     res.json(savedFoods);
    // });

    app.post("/foods",async (req, res) => {
      try {
        const { name, price, type, img, description } = req.body;
        const fdata = new foods({ name, img, price, type, description: description || '' });
        const savedFoods = await fdata.save();
        res.status(201).json(savedFoods);
      } catch (error) {
        console.error("Error uploading food item:", error);
        res.status(500).json({ message: "Failed to upload food item", error });
      }
    });

    //  app.delete('/foods/:id',async(req,res)=>{
    //     const fdata = await foods.findById(req.params.id);
    //     await fdata.deleteOne();
    //     res.send(fdata)
    // })

    app.delete("/foods/:id", async (req, res) => {
      try {
        // Find the food item by ID
        const foodItem = await foods.findById(req.params.id);
    
        if (!foodItem) {
          return res.status(404).json({ message: "Food item not found" });
        }
    
        // Determine the absolute path of the image
        const imagePath = path.join(__dirname, "../food-web/public", foodItem.img);
    
        // Delete the image file if it exists
        if (await fse.pathExists(imagePath)) {
          await fse.remove(imagePath);
        }
    
        // Determine the folder of the "type"
        const typeFolder = path.dirname(imagePath);
    
        // Delete the food item from the database
        await foodItem.deleteOne();
    
        // Check if the folder is empty
        const folderContents = await fse.readdir(typeFolder);
        if (folderContents.length === 0) {
          // If the folder is empty, remove it
          await fse.remove(typeFolder);
        }
    
        res.status(200).json({ message: "Food item and associated resources deleted successfully" });
      } catch (error) {
        console.error("Error deleting food item:", error);
        res.status(500).json({ message: "Failed to delete food item", error });
      }
    });

    app.get('/foods/:id',async(req,res)=>{
        const fdata = await foods.findById({_id:req.params.id});
 
        res.send(fdata)
     })

    //  app.put('/foods/:id',async(req,res)=>{
    //     const fdata = await foods.findById({_id:req.params.id});

    //     fdata.name=req.body.name;
    //     fdata.img=req.body.img;
    //     fdata.price=req.body.price,
    //     fdata.type=req.body.type

    //     await fdata.save();

    //     res.send(fdata)
    //  })


    app.put("/foods/:id", async (req, res) => {
      try {
        const foodItem = await foods.findById(req.params.id);
        if (!foodItem) return res.status(404).json({ message: "Food item not found" });
        foodItem.name  = req.body.name  ?? foodItem.name;
        foodItem.price = req.body.price ?? foodItem.price;
        foodItem.type  = req.body.type  ?? foodItem.type;
        foodItem.img   = req.body.img   ?? foodItem.img;
        foodItem.description = req.body.description ?? foodItem.description;
        await foodItem.save();
        res.status(200).json(foodItem);
      } catch (error) {
        console.error("Error updating food item:", error);
        res.status(500).json({ message: "Failed to update food item", error });
      }
    });

    //  ---login and sign form data ---

    //  app.post('/signup', async (req, res) => {

    //     const udata = new users({
    //         email:req.body.email,
    //         admin: req.body.admin,
    //         name: req.body.name,
    //         password: req.body.password
    //     }) 

    //     const savedUser = await udata.save();
    //     res.json(savedUser);

    // });

    app.post('/signup', async (req, res) => {
        try {
  
          const newUser = new users({
            email:req.body.email,
            admin: req.body.admin,
            name: req.body.name,
            password: req.body.password
          });
  
          const token = await newUser.generateToken();
          await newUser.save()
          res.send({ message: 'successful register' })
        } catch (error) {
          if (error.code === 11000) {
            res.send({ message: 'already Email is exist' });
          } else {
            res.send({ message: error.toString() })
          }
        }
      });

    // app.post('/login', async (req, res) => {

    //     const udata = await users.findOne({email:req.body.email});

    //     if(udata!=null){
    //         if(req.body.password==udata.password){

    //             res.json(udata)
    //             // if(udata.admin==1){
    //             //     console.log("admin")
    //             //     res.json("admin")   
    //             // }else{
    //             //     console.log("user")
    //             //     res.json("user")
    //             // }
                
    //         }else{
    //             console.log("not match")
    //             res.json("notmatch")
    //         }
    //     }else{
    //         res.json("usernotfound")
    //     }

    // });

    app.post('/login', async (req, res) => {
        const user = await users.findOne({ email: req.body.email })
      
        if (user) {
           
          if (user.password == req.body.password) {
            const token = await user.generateToken();
            await user.save()
            res.cookie('jwt', token, { httpOnly: true, sameSite: 'Lax', expires: new Date(Date.now() + 3000000) });
            res.send(user)
          } else {
            res.json("Invalid Password")
          }
        } else {
          res.json("usernotfound")
        }
      })


      // google login

          // Gogle Login 

    app.get('/googlelogin', async (req, res) => {
      try {
        const {code} =req.query;
        const googleRes = await oauth2client.getToken(code);
        oauth2client.setCredentials(googleRes.tokens);

        const userRes = await axios.get(
          `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`,
          { withCredentials: true }
        );

        const {email,name} = userRes.data;
        console.log('email=',email)
        const user = await users.findOne({ email: email })
        if (!user) {
          const newUser = new users({
            name: name,
            email:email,
            password:'googlelogin'
          });
  
          const token = await newUser.generateToken();
          await newUser.save()
          console.log('newwuser=',newUser)
          res.cookie('jwt', token, {
            httpOnly: true, // Only accessible by the backend
            secure: false, // Set to true in production (for HTTPS)
            sameSite: 'Lax', // Allow cookies for cross-origin requests but not for embedded content
            expires: new Date(Date.now() + 3000000) // Set the expiration
        });
          res.send(newUser);
        }else{
          const token = await user.generateToken();
          await user.save()
          console.log('user=',user)
          res.cookie('jwt', token, {
            httpOnly: true, // Only accessible by the backend
            secure: false, // Set to true in production (for HTTPS)
            sameSite: 'Lax', // Allow cookies for cross-origin requests but not for embedded content
            expires: new Date(Date.now() + 3000000) // Set the expiration
        });
          res.send(user);
        }
      } catch (error) {
          console.error('error at google login :',error)
          res.send()
      }

    })


      // logout 


      app.get('/logout', (req, res) => {
        res.clearCookie('jwt')

        // in set auth token is now not set auth is require

        // req.user.tokens = req.user.tokens.filter((token) => {
        //   if (req.token != token) {
        //     return true;
        //   }
        // })
        req.user.save();
        res.json('logout');
      })
  



    //----------user likes foods ------

    app.get('/user/:id',async(req,res)=>{
        const udata = await users.findById({_id:req.params.id});
        // console.log("checkdata",udata.likes)
        res.send(udata.likes)
     })

     app.put('/user/:id',async(req,res)=>{
        const udata = await users.findById({_id:req.params.id});

        udata.likes=req.body

        await udata.save();

        res.send(udata)
     })

    // ------booking event forms-----


    app.post('/booking', async (req, res) => {
        
        const bdata = new booking({
            userid:req.body.userid,
            name:req.body.name,
            email:req.body.email,
            contactno:req.body.contactno,
            description:req.body.description,
            time:req.body.time,
            date:req.body.date,
            bookingdate:req.body.bookingdate,
            status:req.body.status
        }) 

        const savebdata = await bdata.save();
        res.json(savebdata);
    });

    app.get('/booking',async(req,res)=>{
        const bookingdata = await booking.find();
 
        res.send(bookingdata);
     })

    //----get booking to chsnce status cancle by user----

    app.put('/booking/:id',async(req,res)=>{
        const bdata = await booking.findById({_id:req.params.id});
        
        console.log(req.body)
       
        bdata.status=req.body.change

        await bdata.save();

        res.send(bdata)
     })


    //  ------review datasss----

     app.post('/review', async (req, res) => {

        const rdata = new reviews({
            favouratefood:req.body.favouratefood,
            notlikefood: req.body.notlikefood,
            changes: req.body.changes,
            othersuzzetion: req.body.othersuzzetion,
            status:req.body.status
        }) 

        const savedreview = await rdata.save();
        res.json(savedreview);
    });

    app.get('/review',async(req,res)=>{
        const reviewdata = await reviews.find();
 
        res.send(reviewdata);
     })    

     app.put('/review/:id',async(req,res)=>{
        const rdata = await reviews.findById({_id:req.params.id});
        
        console.log(req.body)
       
        rdata.status=req.body.change

        await rdata.save();

        res.send(rdata)
     })
 
     app.delete('/review/:id',async(req,res)=>{
        const rdata = await reviews.findById(req.params.id);
        await rdata.deleteOne();
        res.send(rdata)
    })     

    // ========== SITE CONFIGURATION ROUTES ==========

    // GET config — returns the one config document (upsert if none exists)
    app.get('/config', async (req, res) => {
        try {
            let config = await siteConfig.findOne();
            if (!config) {
                config = new siteConfig({ logoUrl: '', siteName: 'Kudoz Restro' });
                await config.save();
            }
            res.json(config);
        } catch (error) {
            res.status(500).json({ message: 'Failed to get config', error });
        }
    });

    // PUT config — update logo URL and/or site name
    app.put('/config', async (req, res) => {
        try {
            let config = await siteConfig.findOne();
            if (!config) {
                config = new siteConfig();
            }
            if (req.body.logoUrl !== undefined) config.logoUrl = req.body.logoUrl;
            if (req.body.siteName !== undefined) config.siteName = req.body.siteName;
            config.updatedAt = Date.now();
            await config.save();
            res.json(config);
        } catch (error) {
            res.status(500).json({ message: 'Failed to update config', error });
        }
    });

    // ========== GALLERY ROUTES ==========

    // GET all gallery images (sorted by order field)
    app.get('/gallery', async (req, res) => {
        try {
            const galleryData = await gallery.find().sort({ order: 1 });
            res.json(galleryData);
        } catch (error) {
            res.status(500).json({ message: 'Failed to get gallery', error });
        }
    });

    // POST — add a new gallery image
    app.post('/gallery', async (req, res) => {
        try {
            const { title, img, size, order } = req.body;
            const gdata = new gallery({ title, img, size, order });
            const saved = await gdata.save();
            res.status(201).json(saved);
        } catch (error) {
            res.status(500).json({ message: 'Failed to add gallery image', error });
        }
    });

    // PUT — update a gallery image
    app.put('/gallery/:id', async (req, res) => {
        try {
            const gdata = await gallery.findById(req.params.id);
            if (!gdata) return res.status(404).json({ message: 'Gallery image not found' });
            if (req.body.title !== undefined) gdata.title = req.body.title;
            if (req.body.img !== undefined) gdata.img = req.body.img;
            if (req.body.size !== undefined) gdata.size = req.body.size;
            if (req.body.order !== undefined) gdata.order = req.body.order;
            const updated = await gdata.save();
            res.json(updated);
        } catch (error) {
            res.status(500).json({ message: 'Failed to update gallery image', error });
        }
    });

    // DELETE — remove a gallery image
    app.delete('/gallery/:id', async (req, res) => {
        try {
            const gdata = await gallery.findById(req.params.id);
            if (!gdata) return res.status(404).json({ message: 'Gallery image not found' });
            await gdata.deleteOne();
            res.json({ message: 'Gallery image deleted', data: gdata });
        } catch (error) {
            res.status(500).json({ message: 'Failed to delete gallery image', error });
        }
    });

    // =============================================
    // SLIDER IMAGE ROUTES
    // =============================================

    // GET — fetch current slider/hero image
    app.get('/slider-image', async (req, res) => {
        try {
            let doc = await sliderImage.findOne();
            if (!doc) { doc = await new sliderImage({ imgUrl: '' }).save(); }
            res.json(doc);
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch slider image', error });
        }
    });

    // PUT — update slider/hero image
    app.put('/slider-image', async (req, res) => {
        try {
            let doc = await sliderImage.findOne();
            if (!doc) doc = new sliderImage();
            if (req.body.imgUrl !== undefined) doc.imgUrl = req.body.imgUrl;
            doc.updatedAt = Date.now();
            const saved = await doc.save();
            res.json(saved);
        } catch (error) {
            res.status(500).json({ message: 'Failed to update slider image', error });
        }
    });

    // =============================================
    // EVENT IMAGES ROUTES (max 5)
    // =============================================

    // GET — fetch all event images sorted by order
    app.get('/event-images', async (req, res) => {
        try {
            const images = await eventImages.find().sort({ order: 1 });
            res.json(images);
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch event images', error });
        }
    });

    // POST — add a new event image (max 5)
    app.post('/event-images', async (req, res) => {
        try {
            const count = await eventImages.countDocuments();
            if (count >= 5) {
                return res.status(400).json({ message: 'Maximum 5 event images allowed. Delete one first.' });
            }
            const newImg = new eventImages({
                img:   req.body.img,
                alt:   req.body.alt   || 'Event',
                order: req.body.order || count
            });
            const saved = await newImg.save();
            res.status(201).json(saved);
        } catch (error) {
            res.status(500).json({ message: 'Failed to add event image', error });
        }
    });

    // DELETE — remove an event image
    app.delete('/event-images/:id', async (req, res) => {
        try {
            const doc = await eventImages.findById(req.params.id);
            if (!doc) return res.status(404).json({ message: 'Event image not found' });
            await doc.deleteOne();
            res.json({ message: 'Event image deleted', data: doc });
        } catch (error) {
            res.status(500).json({ message: 'Failed to delete event image', error });
        }
    });

    // =============================================
    // FOOD RATING ROUTES
    // =============================================

    // POST /foods/:id/rate  — user submits a rating (upsert)
    app.post('/foods/:id/rate', async (req, res) => {
        try {
            const { userId, rating } = req.body;
            if (!userId) return res.status(401).json({ message: 'Login required to rate' });
            const r = parseFloat(rating);
            if (isNaN(r) || r < 1 || r > 5) return res.status(400).json({ message: 'Rating must be 1–5' });

            await foodRatings.findOneAndUpdate(
                { foodId: req.params.id, userId },
                { rating: r, createdAt: new Date() },
                { upsert: true, new: true }
            );

            // Return updated stats
            const agg = await foodRatings.aggregate([
                { $match: { foodId: new require('mongoose').Types.ObjectId(req.params.id) } },
                { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
            ]);
            const stats = agg[0] || { avg: 0, count: 0 };
            res.json({ avgUserRating: Math.round(stats.avg * 10) / 10, ratingCount: stats.count, yourRating: r });
        } catch (error) {
            res.status(500).json({ message: 'Failed to submit rating', error });
        }
    });

    // GET /foods/:id/ratings  — get rating stats + user's own rating
    app.get('/foods/:id/ratings', async (req, res) => {
        try {
            const { userId } = req.query;
            const agg = await foodRatings.aggregate([
                { $match: { foodId: new require('mongoose').Types.ObjectId(req.params.id) } },
                { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
            ]);
            const stats = agg[0] || { avg: 0, count: 0 };
            let yourRating = 0;
            if (userId) {
                const existing = await foodRatings.findOne({ foodId: req.params.id, userId });
                if (existing) yourRating = existing.rating;
            }
            res.json({ avgUserRating: Math.round(stats.avg * 10) / 10, ratingCount: stats.count, yourRating });
        } catch (error) {
            res.status(500).json({ message: 'Failed to get ratings', error });
        }
    });

    // PUT /foods/:id/admin-boost  — admin sets boost (0–5), separate from user avg
    app.put('/foods/:id/admin-boost', async (req, res) => {
        try {
            const foodItem = await foods.findById(req.params.id);
            if (!foodItem) return res.status(404).json({ message: 'Food not found' });
            const boost = parseFloat(req.body.adminRatingBoost);
            if (isNaN(boost) || boost < 0 || boost > 5) return res.status(400).json({ message: 'Boost must be 0–5' });
            foodItem.adminRatingBoost = boost;
            await foodItem.save();
            res.json(foodItem);
        } catch (error) {
            res.status(500).json({ message: 'Failed to update admin boost', error });
        }
    });

    // GET /admin/food-ratings  — all foods with their user rating stats
    app.get('/admin/food-ratings', async (req, res) => {
        try {
            const allFoods = await foods.find();
            const ratingAgg = await foodRatings.aggregate([
                { $group: { _id: '$foodId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
            ]);
            const ratingMap = {};
            ratingAgg.forEach(r => { ratingMap[r._id.toString()] = { avg: r.avg, count: r.count }; });

            // Like counts
            const allUsers = await users.find({ likes: { $exists: true, $ne: [] } }, { likes: 1 });
            const likeMap = {};
            allUsers.forEach(u => {
                (u.likes || []).forEach(fid => {
                    const key = fid.toString();
                    likeMap[key] = (likeMap[key] || 0) + 1;
                });
            });

            const result = allFoods.map(f => ({
                ...f.toObject(),
                avgUserRating: Math.round((ratingMap[f._id.toString()]?.avg || 0) * 10) / 10,
                ratingCount: ratingMap[f._id.toString()]?.count || 0,
                likeCount: likeMap[f._id.toString()] || 0
            }));
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: 'Failed to get food ratings', error });
        }
    });

    app.listen(3030,()=>{
        console.log("server started")
    })
    
});
//VARIABLE DECLARATIONS
const express = require("express");
const mysql= require("mysql")
const path = require("path");
const app = express();
const session = require("express-session")
const bcrypt = require('bcrypt')



app.set("view engine","ejs")
const dbConn = mysql.createConnection({
    host:'localhost',
    user:'root',
     password:'',
     database:'emergency app'
})

// MIDDLEWARES
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname,"Public")))
app.use (session({
    secret: 'yourencryptionkey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure:false }
}))
function isAuthenticated(req, res, next) {
    if (!req.session.user || !req.session.user.Email) {
        return res.status(401).send("Unauthorized: Please log in.");
    }
    next();
}

//ROUTES

app.get("/newlanding",(req,res)=>{
    res.render("newlanding")
})
app.get("/signup", (req,res)=>{
    res.render("signup")
})
app.get("/services",(req,res)=>{
    res.render("servicetype")
})
app.get("/signin",(req,res)=>{
    res.render('signin')
})


//dbtesting

dbConn.connect((err) => {
    if (err) {
        console.error("Error connecting to the database:", err.stack);
        return;
    }
    console.log("Connected to the database as id " + dbConn.threadId);
});


//insert signup

app.post('/signup', (req,res)=>{
   const{FullName,Email,PASSWORD}= req.body
   let hashPassword = bcrypt.hashSync(PASSWORD,10)

   console.log({FullName, Email,hashPassword})
   
    dbConn.query("INSERT INTO users (FullName, PASSWORD, Email) VALUES (?, ?, ?)",
        [FullName, hashPassword, Email],
        (err,result)=>{
        if(err){
            console.log(err)
          
        } else{
       
            req.session.user = { Email:req.body.Email }; 
            res.redirect("/newlanding")
        }}
    )

})


//Signin
app.post("/signin",(req,res)=>{
   const{Email,hashPassword} =req.body
   dbConn.query("SELECT * FROM users WHERE Email = ?",[Email],(error,data)=>{
       if(error){
           console.log(error)
           res.status(500).send("server error")
       }else{
           console.log(data)
           if(data.length==0){
               res.render("signin.ejs",{errorMessage:"email not registered.Sign up"})
           }else{
               let passwordMatch=bcrypt.compareSync(req.body.PASSWORD,data[0].PASSWORD)
               if(passwordMatch){
               req.session.user={Email}
               res.redirect("/newlanding")
            }else{
                res.redirect("/signup")
            }
           
           }
}})
})

// GET route to display the medical information form
app.get('/medicalbootstrap', (req, res) => {
    if (!req.session.user || !req.session.user.Email) {
      return res.redirect('/signup'); 
    }
  
    const userEmail = req.session.user.Email;
  
    // Fetch the user's medical info from the database
    dbConn.query("SELECT * FROM Medical_info WHERE Email = ?", [userEmail], (err, result) => {
      if (err) {
        console.error("Error retrieving medical info:", err.stack);
        return res.status(500).send("Server error");
      }
       const medicalInfo = result[0];
       if (medicalInfo.Phone_number ) {
            
          // User has filled out the form; render the showmedical page with their info
          res.render('showmedical', { medicalInfo });
        } else {
        res.render('medicalbootstrap');
      }
})
    

  })

  
  // POST route to handle form submission and update medical information
  app.post('/medicalbootstrap', (req, res) => {
    const { Phone_number, Allergies, Medical_conditions, Blood_group, Date_of_birth } = req.body;
  
    if (!req.session.user || !req.session.user.Email) {
      return res.status(401).send("Unauthorized: Please log in.");
    }
  
    const userEmail = req.session.user.Email;
  
    // Check if medical information for the user already exists
    dbConn.query("SELECT * FROM Medical_info WHERE Email = ?", [userEmail], (err, result) => {
      if (err) {
        console.error("Error retrieving medical info:", err.stack);
        return res.status(500).send("Server error");
      }
  
      if (result.length > 0) {
        // Medical info exists, so update it
        dbConn.query("UPDATE Medical_info SET Phone_number = ?, Allergies = ?, Medical_conditions = ?, Blood_group = ?, Date_of_birth = ? WHERE Email = ?",
          [Phone_number, Allergies, Medical_conditions, Blood_group, Date_of_birth, userEmail], (err) => {
            if (err) {
              console.error("Error updating medical info:", err.stack);
              return res.status(500).send("Error occurred while updating medical info.");
            }
  
            // Redirect to a success page or render a success message
            res.redirect('/medicalbootstrap'); // Change this to your desired redirection or response
          });
      } 
    });
  });
  
  // Route for successful submission
  app.get('/showmedical', (req, res) => {
    res.render("showmedical",{ medicalInfo:result[0]});
  });
  

                            //service type

//police services
app.get('/police', (req,res) => {
    dbConn.query('SELECT DISTINCT Station_County FROM police_stations ORDER BY Station_County', (err,Station_County) => {
        if (err) {
            res.status(500).send('Server Error');
        } else {
            res.render('police',{Station_County: Station_County});
      
        }
    });
});

app.get('/get_police', (req,res) => {

    let type = req.query.type;
    let parent_val = req.query.parent_value;
    let arr = '';

    if (type ==='load_Station_Constituency'){
         arr =`SELECT DISTINCT Station_Constituency FROM police_stations WHERE Station_County = ? ORDER BY Station_Constituency`
        
        
    }else if(type ==='load_Station_Name'){
     arr =`SELECT DISTINCT Station_Name FROM police_stations WHERE Station_Constituency = ? ORDER BY Station_Name`
         
    }else if(type==='load_station_contacts'){
        arr = `SELECT Station_Contacts,Station_Email FROM police_stations WHERE Station_Name = ?`
    }
    dbConn.query(arr, [parent_val], (err,data)=>{
        if(err){
            console.error("Error during the query:", err.stack);
            res.status(500).send('Server Error');
            
        }else{ if(type === 'load_station_contacts'){
            res.json(data[0] || {});
        }else{
        let data_array = []
        data.forEach( station =>{
            data_array.push(Object.values(station)[0]);
        })

     res.json(data_array);
      }
    }
    })
});

// Route to display hospitals page
app.get('/hospitals', (req, res) => {
    dbConn.query("SELECT DISTINCT Hospital_county FROM hospitals", (err, Hospital_county) => {
        if (err) {
            console.error("Error in query:", err.stack);
            return res.status(500).send("Server Error");
        }
        res.render('hospitals', { Hospital_county });
    });
});

// Route to get hospital data based on selection
app.get('/get_hospital', (req, res) => {
    const type = req.query.type;
    const parent_value = req.query.parent_value;
    let query = '';

    if (type === 'load_Hospital_constituency') {
        query = "SELECT DISTINCT Hospital_constituency FROM hospitals WHERE Hospital_county = ? ORDER BY Hospital_constituency";
    } else if (type === 'load_Hospital_name') {
        query = "SELECT DISTINCT Hospital_name FROM hospitals WHERE Hospital_constituency = ? ORDER BY Hospital_name";
    } else if (type === 'load_Hospital_contacts') {
        query = "SELECT Hospital_telephone, Hospital_email FROM hospitals WHERE Hospital_name = ?";
    }

    dbConn.query(query, [parent_value], (err, data) => {
        if (err) {
            console.error("Error during the query:", err.stack);
            return res.status(500).send("Server Error");
        }
        
        if (type === 'load_Hospital_contacts') {
            // Return the first contact info found or an empty object
            res.json(data[0] || {});
        } else {
            // Return an array of the first column (e.g., constituency or hospital names)
            const dataArray = data.map(item => Object.values(item)[0]);
            res.json(dataArray);
        }
    });
});

app.listen(3000, ()=>{
    console.log("running successful")
})
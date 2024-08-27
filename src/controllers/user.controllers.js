import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { upload } from "../middlewares/multer.middlewares.js";

const registerUser = asyncHandler( async(req, res) => {
    // take username/email, password and fullname from the user 
    // ensure every field should have something and check validity of email and suggest strong password 
    // convert hte password into hash code using bcrypt to secure it
    // save all details of user to the databse and send a message to user that it registered successfully
    const {fullName, email, password, username} = req.body;

    if(
        [fullName, email, password, username].some((field) =>
            field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if(existedUser){
        throw new ApiError(409, "username or email already exist!! existed user");
    }

   

   const avatarLocalPath = req.files?.avatar[0]?.path
   console.log(req.files.avatar[0].path);
   //const coverImageLocalPath = req.files?.coverImage[0]?.path;

   const avatar = await uploadOnCloudinary(avatarLocalPath);
  // const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  console.log(avatar);

   if(!avatar){
    throw new ApiError(409, "username or email already exist!!");
   }

   const user = await User.create({
    fullName,
    avatar: avatar.url,
   // coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()

   });

   const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
   );

   if(!createdUser){
    throw new ApiError(500, "Something went wrong while registering the user!! Kinldy try again");
   }

   return res.status(201).json(
    new ApiResponse(200, createdUser, "User Registered Successfully")
   )


});


export default registerUser
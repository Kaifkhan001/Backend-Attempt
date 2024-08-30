import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { upload } from "../middlewares/multer.middlewares.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accesssToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        user.save({validateBeforeSave: false} )

        return {accesssToken, refreshToken};
        
    } catch (error) {
        throw new ApiError(500, "Something went wrong!! Try Again");
    }
}

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

const loginUser = asyncHandler( async(req, res) => {
   //take input from the user and check whether user provide sufficient info or not
   // set is in a varible
   // now using it's data check in the databse whether any account is lie or not in the db
   // if yes then, redirect to dashboard page else send a message "You need to register first"
   const {email, username, password} = req.body;

   if(!(username || email)){
    throw new ApiError(400, "Username or Email is required" );
   }

   const user = await User.findOne({
    $or: [{username},{email}]
   });

   if(!user){
    throw new ApiError(404, "You need to register first!!");
   }
   
  const isPasswordValid = await user.isPasswordCorrect(password);   

  if(!isPasswordValid){
      throw new ApiError(401, "Password is incorrect");
  }

  const {accesssToken, refreshToken} =  await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secrue: true
  }

  return res.status(200).cookie("accessToken", accesssToken, options).cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(200, 
        {
            user: loggedInUser, accesssToken
            , refreshToken
        }
    )
  )

});

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
     )
     const options = {
        httpOnly: true,
        secrue: true
      }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"))
});

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingrefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingrefreshToken){
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(incomingrefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
      
       const user = await User.findById(decodedToken?._id)
         
       if(!user){
        throw new ApiError(401, "Invalid refresh token");
       }
    
       if(incomingrefreshToken !== user?.refreshToken){
        throw new ApiError(401, "Refresh token expired");
       }
    
       const options = {
        httpOnly: true,
        secrue: true
       }
    
       const {accesssToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
    
       return res
       .status(200)
       .cookie("accessToken", accesssToken, options)
       .cookie("refreshToken", newRefreshToken, options)
       .json(
        new ApiResponse(
            200,
            {
                accesssToken,
                refreshToken: newRefreshToken
            },
            "Access token refreshed"
    
        )
       )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid Password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"));
 })

 const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully");
 });

 const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body;

    if (!(fullName || email)) {
        throw new ApiError(400, "All fileds are required");
    }

    const user = await User.findByIdAndDelete(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {new: true}
    ).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200, user, 
        "Account details updated successfully"
    ))
 });

 const updateUserAvatar = asyncHandler(async(req, res) => {

    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading on avatar");
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true},
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar Image Updated Successfully")
    )
 });

 const getUserChannelProfile = asyncHandler(async(req, res) => {
       const {username} = req.params;

       if(!username?.trim()){
        throw new ApiError(400, "Username is missing");
       }

       const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount : {
                    $size: "$subscribers"
                },
                channelSubscribedToCount : {
                    $size: "$subscribedTo"
                },
                isSubscribed : {
                 $cond: {
                    if: {$in: [req.user?._id, "$subscribers.subscriber"]}
                 }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                email: 1
            }
        }
       ]);

       if(!channel?.length){
        throw new ApiError(401, "Channel does not exists");
       }

       return res
       .status(200)
       .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
       )
 });

 const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
 });

 



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    getUserChannelProfile,
    getWatchHistory
};
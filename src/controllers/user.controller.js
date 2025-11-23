import { User } from '../db/users.models.js';


const generateRefreshTokenandAccessToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Token Generation Error:", error);
    throw new Error("Token Error");
  }
};





export const userRegister = async (req, res) => {
  try {
    // user details
    const { fullName, email, password } = req.body;
    // check the details for missing values
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" })
    }
    // if user already registered 
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(409).json({ message: "User already exists" })

    // Register the user in the DB
    const user = await User.create({
      fullName,
      email,
      password
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    return res.status(200)
      .json(
        {
          message: "User registered Successfully",
          user: createdUser
        }
      )
  } catch (error) {
    console.error("Registration Error :", error)
    return res.status(500).json({ message: "Internal Server Error" })
  }
}


export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "all fields are required" })
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "user not found" })
    }
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid Credentials" })
    }

    const { accessToken, refreshToken } = await generateRefreshTokenandAccessToken(user._id);

    const loggedInUser = user.toObject();

    delete loggedInUser.password;
    delete loggedInUser.refreshToken;
    delete loggedInUser.__v;
    delete loggedInUser.createdAt;
    delete loggedInUser.updatedAt;

    const options = {
      httpOnly: true,
      secure: true
    }

    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
      {
        user: loggedInUser, accessToken, refreshToken,
        message: "user Login successfully",

      }
    )

  } catch (error) {
    console.log("Error :", error)
    return res.status(500).json({ message: "Internal Server Error" })
  }
}


export const userLogOut = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set:
    {
      refreshToken: undefined,
    }
  },
    {
      new: true
    }
  )
  const options = {
    httpOnly: true,
    secure: true
  }
  return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json({ message: "user logged Out" })

}


export const userProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -refreshToken ").lean();

    if (!user) return res.status(404).json({ message: "user not found" })

    return res.status(200).json({ user })

  } catch (error) {
    console.log("Error :", error)
    return res.status(500).json({ message: "Internal Server Error" })
  }
}

export const updateProfile = async (req, res) => {
  try {
    const updates = {}
    const { fullName, phoneNumber } = req.body; 
    
    if (!fullName && !phoneNumber)
      return res.status(400).json({ message: "no field provided to update" })
    
    if(fullName) updates.fullName = fullName;
    if(phoneNumber) updates.phoneNumber = phoneNumber;
    
    const updatedUser = await User.findByIdAndUpdate(req.user._id,
      {
        $set:updates        
      },
      {
        new: true,
        runValidators: true
      }
    ).select("-refreshToken -password")

    if (!updatedUser) return res.status(404).json({ message: "user not found" })

    return res.status(200).json({ updatedUser })
  } catch (error) {
    console.log("Error :", error)
    return res.status(500).json({ message: "Internal Server Error" })
  }
}

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user._id)
    if (!user)
      return res.status(404).json({ message: "User not found" })

    const options = {
      httpOnly: true,
      secure: true
    }
    return res.status(200).clearCookie("refreshToken", options)
      .clearCookie("accessToken", options).json({ message: "profile deleted successfully" })
  } catch (error) {
    console.log("Error :", error)
    return res.status(500).json({ message: "Internal Server Error" })
  }
}

// address is not complete yet

export const userAddress = async (req , res) => {
  try {
    const user = await User.findById(req.user._id)
    if(!user) 
      return res.status(404).json({message:"user not found"})    

    const address = user.address;
    
    if (!address || (typeof address === "object" && Object.keys(address).length === 0)) {
      return res.status(200).json({ message: "No address found" });
    }
    // if(!address || address === "")  
    //   return res.status(200).json({message : "no address found"})

    return res.status(200).json( { address } )

  } catch (error) {
    console.log("Error :", error)
    return res.status(500).json({ message: "Internal Server Error" })
  }
}

export const updateAddress = async(req , res) => {
  try {  
    const {street , city , state , postalCode , country } = req.body;
    if(!street || !city || !state || ! postalCode || !country )
        return res.status(400).json({message:"all fields are required"})

    const newAddress = {street , city , state , postalCode , country }

    const updatedAddress = await User.findByIdAndUpdate(req.user._id,{
      $set: {address : newAddress}
    },
    {
      new: true ,
      runValidators : true 
    }  
  )
  if(!updatedAddress)   
    return res.status(500).json({message:"Internal Server Error"})

  return res.status(200).json( updatedAddress )

  } catch (error) {
    console.log("Error :", error)
    return res.status(500).json({ message: "Internal Server Error" })
  }
}

export const deleteAddress = async (req , res) => {
  try {
    const user =await User.findById(req.user._id,
      {
        $unset: { address:1 }
      },
      {
        new:true,
      }
    ).select("-password -refreshToken")

    if(!user) 
      return res.status(404).json({message:"user not found"})

    return res.status(200).json({ message:"address deleted successfully",user })
    
  } catch (error) {
    console.log("Error :", error)
    return res.status(500).json({ message: "Internal Server Error" })
  }
}
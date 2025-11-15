
const isAdmin = async (req , res , next ) => {
    try {
        if(req.user.role !== "admin" || !req.user){
            return res.status(403).json({message:"Access Denied"});
        }
        next();
        
    } catch (error) {
        console.log("Error in Admin middleware");
        throw new Error("Internal Server Error")
    }
}

export { isAdmin } 
import { Review } from "../db/reviews.model.js";
import { Product } from "../db/products.model.js";


export const deleteReview = async (req, res) => {
    try {
        const userId = req.user?._id
        const { commentId } = req.params

        if (!userId)
            return res.status(400).json({ message: "unauthorised request" })

        const review  = await Review.findOneAndUpdate(
            {
                "comments._id": commentId,
                user: userId
            },
            {
                $pull: { comments: { _id: commentId } }
            },
            { new: true }
        );

        if (!review)
            return res.status(404).json({ message: "review not found" })
        
        await review.save();

        return res.status(200).json({ message: "Review Deleted successfully", review })

    } catch (error) {
        console.log(error);

        return res.status(500).json({ message: "Internal Server Error" })
    }
}

export const addReviews = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, text } = req.body;
        const userId = req.user?._id;

        if (!id) {
            return res.status(400).json({ message: "Product Id is required" });
        }

        if (!rating) {
            return res.status(400).json({ message: "Rating required" });
        }

        const existing = await Review.findOne({
            product: id,
            user: userId
        });

        let newReview;
        if (!existing) {
            newReview = await Review.create({
                product: id,
                user: userId,
                rating,
                comments: [{ text }]
            });
        } else {
            existing.rating = rating
            existing.comments.push({ text })
            newReview = await existing.save()
        }

        const reviews = await Review.find({ product: id });

        const avg =
            reviews.reduce((acc, r) => acc + r.rating, 0) /
            reviews.length;

        await Product.findByIdAndUpdate(id, {
            averageRating: avg,
            numReviews: reviews.length
        });

        return res.status(201).json({
            message: "Review added successfully",
            review: newReview
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};


export const getReviews = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id)
            return res.status(400).json({ message: "Product Id is required" })

        const reviews = (await Review.find({ product: id }).populate("user", "name").sort({ createdAt: -1 }));

        return res.status(200).json({ reviews })

    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "Internal Server ERROR", error: error.message, stack: error.stack })

    }
}
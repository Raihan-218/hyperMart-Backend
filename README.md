# HyperMart Backend 

A scalable and secure backend for the **HyperMart E-Commerce Platform** built using **Node.js**, **Express.js**, **MongoDB**, and **JWT Authentication**.
This backend powers authentication, product management, cart operations, order processing, reviews, and admin functionalities for the HyperMart fashion store. 

---

# ✨ Features

## 🔐 Authentication & Authorization

* User Registration
* User Login & Logout
* JWT Access & Refresh Tokens
* Cookie-based authentication
* Protected routes
* Role-based access control

  * User
  * Admin
  * Employee

---

## 👕 Product Management

* Add Products
* Update Products
* Delete Products
* Get Single Product
* Get All Products
* Product category filtering
* Cloudinary image upload support
* Multiple image uploads using Multer

---

## 🛒 Cart System

* Add items to cart
* Remove cart items
* Fetch user cart
* Checkout flow
* Order generation from cart

---

## ⭐ Reviews System

* Add product reviews
* Delete reviews
* Product rating calculation
* Review fetching per product

---

## 📦 Orders Management

* Create orders
* Track order history
* Update order status
* Assign delivery personnel
* Admin order management

---

## ☁️ Cloudinary Integration

* Upload product images
* Delete images from Cloudinary
* Optimized image handling

---

# 🧱 Tech Stack

## Backend

* Node.js
* Express.js

## Database

* MongoDB
* Mongoose ODM

## Authentication

* JWT
* bcrypt
* Cookie Parser

## File Uploads

* Multer
* Cloudinary

## Development Tools

* Nodemon
* Prettier

---

# 📂 Project Structure

```bash id="uwtzkt"
src/
│
├── controllers/
│   ├── admin.controller.js
│   ├── cart.controller.js
│   ├── products.controller.js
│   ├── reviews.controller.js
│   └── user.controller.js
│
├── middleware/
│   ├── auth.middleware.js
│   ├── admin.middleware.js
│   └── multer.middleware.js
│
├── routes/
│   ├── user.routes.js
│   ├── products.route.js
│   ├── carts.routes.js
│   ├── review.routes.js
│   └── admin.routes.js
│
├── db/
│   ├── users.models.js
│   ├── products.model.js
│   ├── carts.model.js
│   ├── orders.model.js
│   └── reviews.model.js
│
├── config/
│   └── cloudinary.config.js
│
├── utils/
│   └── cloudinary.utils.js
│
├── app.js
└── main.js
```

---

# ⚙️ Installation

## 1️⃣ Clone Repository

```bash id="czmrvn"
git clone https://github.com/your-username/hypermart-backend.git
cd hypermart-backend
```

---

## 2️⃣ Install Dependencies

```bash id="ng8c2s"
npm install
```

---

# 🔑 Environment Variables

Create a `.env` file in the root directory.

```env id="yvztgf"
PORT=5000

DB_URI=your_mongodb_connection_string

CORS_ORIGIN=http://localhost:5173

AccessTokenSecret=your_access_token_secret
AccessTokenExpiry=1d

RefreshTokenSecret=your_refresh_token_secret
RefreshTokenExpiry=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

# 🚀 Running the Server

## Development Mode

```bash id="lsc9f9"
npm run dev
```

## Production Mode

```bash id="fbe9ph"
npm start
```

Server runs on:

```bash id="bdn8tp"
http://localhost:5000
```

---

# 🔌 API Base URL

```bash id="n5oxwp"
/api/v1
```

---

# 🧑‍💻 Authentication Routes

| Method | Endpoint          | Description          |
| ------ | ----------------- | -------------------- |
| POST   | `/users/register` | Register user        |
| POST   | `/users/login`    | Login user           |
| POST   | `/users/logout`   | Logout user          |
| GET    | `/users/me`       | Current user profile |
| PUT    | `/users/profile`  | Update profile       |
| DELETE | `/users/account`  | Delete account       |

---

# 👕 Product Routes

| Method | Endpoint                      | Description         |
| ------ | ----------------------------- | ------------------- |
| GET    | `/products`                   | Get all products    |
| GET    | `/products/:id`               | Get single product  |
| POST   | `/products/addproducts`       | Add product (Admin) |
| PUT    | `/products/updateProduct/:id` | Update product      |
| DELETE | `/products/delete/:id`        | Delete product      |

---

# 🛒 Cart Routes

| Method | Endpoint                    | Description      |
| ------ | --------------------------- | ---------------- |
| GET    | `/carts`                    | Fetch cart       |
| POST   | `/carts/add`                | Add to cart      |
| DELETE | `/carts/remove/:product_id` | Remove cart item |
| POST   | `/carts/checkout`           | Checkout         |

---

# ⭐ Review Routes

| Method | Endpoint                      | Description         |
| ------ | ----------------------------- | ------------------- |
| GET    | `/reviews/:id`                | Get product reviews |
| POST   | `/reviews/:id`                | Add review          |
| DELETE | `/reviews/comment/:commentId` | Delete review       |

---

# 🛠️ Admin Routes

| Method | Endpoint             | Description         |
| ------ | -------------------- | ------------------- |
| GET    | `/admin/users`       | Get all users       |
| GET    | `/admin/orders`      | Get all orders      |
| PUT    | `/admin/orderstatus` | Update order status |

---

# 🔐 JWT Authentication

Authentication uses:

* Access Tokens
* Refresh Tokens
* HTTP-only cookies
* Middleware-based route protection

Protected routes use:

```js id="7cggyr"
verifyJWT
```

Admin routes use:

```js id="jlwmow"
isAdmin
```

---

# ☁️ Cloudinary Upload System

Images are:

1. Uploaded locally using Multer
2. Sent to Cloudinary
3. Stored using secure URLs
4. Deleted automatically from local storage

---

# 📦 Database Models

## User Model

Includes:

* Full Name
* Email
* Password hashing
* Roles
* Address
* Wishlist

## Product Model

Includes:

* Name
* Description
* Price
* Category
* Inventory
* Images
* Ratings

## Cart Model

Includes:

* User
* Product
* Quantity
* Price

## Order Model

Includes:

* Order items
* Tracking history
* Shipping address
* Delivery status

## Review Model

Includes:

* Rating
* Comments
* Product reference
* User reference

---

# 👑 Make User Admin

Run the admin promotion script:

```bash id="2i6mde"
node scripts/makeAdmin.js user@example.com
```

This promotes the user to admin role. 

---

# 🌐 Deployment

This backend can be deployed on:

* Vercel
* Render
* Railway

Current project includes:

* `vercel.json`
* Environment variable support
* Production-ready structure

---

# 🧹 Code Formatting

Format code using:

```bash id="8sgh0l"
npm run format
```

Uses:

* Prettier
* ESLint friendly structure

---

# 🔮 Future Improvements

* Razorpay/Stripe Integration
* Email Verification
* Forgot Password System
* Wishlist API
* Coupon System
* Inventory Analytics
* Search & Filtering
* Pagination
* Real-time Order Tracking
* Redis Caching

---

# 🤝 Contributing

```bash id="wxoohw"
Fork the repository
Create your feature branch
Commit your changes
Push to the branch
Create a Pull Request
```

---

# 👨‍💻 Author

Developed by Sheikh Raihan 

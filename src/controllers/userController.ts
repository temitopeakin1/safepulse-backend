import { pool } from 'config/database';
import {Request, Response} from 'express';
import asyncHandler from 'express-async-handler';


// register user
const registerUser = asyncHandler(async (req: Request, res: Response) => {
  // Registration logic here
    const {username, email, password} = req.body;
    if (!username || !email || !password ) {
        res.status(400);
        throw new Error('All fields are mandatory');
    }

    // check if user exists
    const userCheck = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [email]
  )

    if (userCheck.rows.length > 0) {
    res.status(409) 
    throw new Error("User already registered")
  }

    //insert user
    const result = await pool.query(
    "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email",
    [username, email, password]
    )
})

export { registerUser };

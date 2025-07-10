import dotenv from "dotenv";
dotenv.config();

// Updated app.js
import './utils/cloudinary.js';
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import LocalStrategy from "passport-local";
import multer from 'multer';

import { storage as cloudinaryStorage } from './utils/cloudinary.js';

const cloudinaryUpload = multer({ storage: cloudinaryStorage });

const app = express();
const port = 3000;
const salt_rounds = 10
;

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "nexora",
    password: process.env.DB_PASSWORD,
    port: 5432,
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage: storage });


db.connect();

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: "nexora-secret-key",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({
    usernameField: "username",
    passwordField: "password"
}, async (email, password, done) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) {
            return done(null, false, { message: "No user found" });
        }
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return done(null, false, { message: "Incorrect password" });
        }
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
        done(null, result.rows[0]);
    } catch (err) {
        done(err);
    }
});

// Routes
app.get("/", (req, res) => {
    res.render("landing");
});

app.get("/landing", (req, res) => {
    res.render("landing");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});app.get("/interview", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  const userId = req.user.id;

  try {
    // Followers count
    const followersRes = await db.query(
      "SELECT COUNT(*) AS count FROM follows WHERE following_id = $1",
      [userId]
    );
    const followers = parseInt(followersRes.rows[0].count);

    // Following count
    const followingRes = await db.query(
      "SELECT COUNT(*) AS count FROM follows WHERE follower_id = $1",
      [userId]
    );
    const following = parseInt(followingRes.rows[0].count);

    res.render("interview", {
      user: req.user,
      followers,
      following,
    });
  } catch (err) {
    console.error("Error loading followers/following:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get('/interview/:id', async (req, res) => {
  const interviewId = req.params.id;

  try {
    const interviewResult = await db.query('SELECT * FROM interviews WHERE id = $1', [interviewId]);

    if (interviewResult.rows.length === 0) {
      return res.status(404).send('Interview not found');
    }

    const interview = interviewResult.rows[0];

    const tagsResult = await db.query('SELECT tag FROM interview_tags WHERE interview_id = $1', [interviewId]);
    const tags = tagsResult.rows.map(row => row.tag);

    const roundsResult = await db.query(
      'SELECT * FROM interview_rounds WHERE interview_id = $1 ORDER BY round_number',
      [interviewId]
    );
    const rounds = roundsResult.rows;

    res.render('interview_details', {
      interview,
      tags,
      rounds
    });

  } catch (error) {
    console.error('Error loading interview detail page:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get("/roadmap", async (req, res) => {
  if (req.isAuthenticated()) {
    const userId = req.user.id;

    try {
      const followersRes = await db.query(
        "SELECT COUNT(*) FROM follows WHERE following_id = $1",
        [userId]
      );
      const followers = parseInt(followersRes.rows[0].count);

      const followingRes = await db.query(
        "SELECT COUNT(*) FROM follows WHERE follower_id = $1",
        [userId]
      );
      const following = parseInt(followingRes.rows[0].count);

      res.render("roadmap", {
        user: req.user,
        followers,
        following,
      });
    } catch (err) {
      console.error("Error fetching followers/following:", err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/login");
  }
});
app.get("/user_profile", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  const userId = req.user.id;

  try {
    // Get followers count
    const followersRes = await db.query(
      "SELECT COUNT(*) AS count FROM follows WHERE following_id = $1",
      [userId]
    );
    const followers = parseInt(followersRes.rows[0].count);

    // Get following count
    const followingRes = await db.query(
      "SELECT COUNT(*) AS count FROM follows WHERE follower_id = $1",
      [userId]
    );
    const following = parseInt(followingRes.rows[0].count);

    // Render profile page
    res.render("user_profile", {
      user: req.user,
      editMode: false,
      followers,
      following,
    });
  } catch (err) {
    console.error("Error fetching followers/following on /user_profile:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/user_profile/edit", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  const userId = req.user.id;

  try {
    const followersRes = await db.query(
      "SELECT COUNT(*) AS count FROM follows WHERE following_id = $1",
      [userId]
    );
    const followers = parseInt(followersRes.rows[0].count);

    const followingRes = await db.query(
      "SELECT COUNT(*) AS count FROM follows WHERE follower_id = $1",
      [userId]
    );
    const following = parseInt(followingRes.rows[0].count);

    res.render("user_profile", {
      user: req.user,
      editMode: true,
      followers,
      following
    });
  } catch (err) {
    console.error("Error in /user_profile/edit:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/jobs", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  const userId = req.user.id;

  try {
    // Fetch posts and authors
    const postsRes = await db.query(`
      SELECT posts.*, users.name 
      FROM posts 
      JOIN users ON users.id = posts.user_id
    `);

    // Fetch saved posts by this user
    const savedRes = await db.query(
      "SELECT post_id FROM saved_posts WHERE user_id = $1",
      [userId]
    );
    const savedIds = new Set(savedRes.rows.map(row => row.post_id));

    // Attach is_saved to each post
    const postsWithSaved = postsRes.rows.map(post => ({
      ...post,
      is_saved: savedIds.has(post.id)
    }));

    // Fetch followers and following counts
    const followersRes = await db.query(
      "SELECT COUNT(*) AS count FROM follows WHERE following_id = $1",
      [userId]
    );
    const followers = parseInt(followersRes.rows[0].count);

    const followingRes = await db.query(
      "SELECT COUNT(*) AS count FROM follows WHERE follower_id = $1",
      [userId]
    );
    const following = parseInt(followingRes.rows[0].count);

    // Render everything
    res.render("jobs", {
      posts: postsWithSaved,
      user: req.user,
      followers,
      following
    });
  } catch (err) {
    console.error("Error loading /jobs:", err);
    res.status(500).send("Internal Server Error");
  }
});


app.get("/job/:id", async(req,res)=>{
    const jobid=req.params.id;
    const result=await db.query("SELECT * FROM jobs WHERE id=$1",[jobid]);
    const job=result.rows[0];
    res.render("job_detail",{job});
});
app.get("/home_profile", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const userId = req.user.id;

      // Fetch follower and following counts
      const followersRes = await db.query(
        "SELECT COUNT(*) FROM follows WHERE following_id = $1",
        [userId]
      );
      const followers = parseInt(followersRes.rows[0].count);

      const followingRes = await db.query(
        "SELECT COUNT(*) FROM follows WHERE follower_id = $1",
        [userId]
      );
      const following = parseInt(followingRes.rows[0].count);

      // Fetch posts and related info
      const postsResult = await db.query(`
        SELECT posts.*, users.name, users.username, users.bio,
               COALESCE(posts.like_count, 0) as like_count,
               CASE WHEN user_likes.post_id IS NOT NULL THEN true ELSE false END as user_liked,
               CASE WHEN follows.id IS NOT NULL THEN true ELSE false END as is_following,
               CASE WHEN saved_posts.id IS NOT NULL THEN true ELSE false END as is_saved
        FROM posts 
        JOIN users ON posts.user_id = users.id 
        LEFT JOIN (
          SELECT post_id FROM likes WHERE user_id = $1
        ) user_likes ON posts.id = user_likes.post_id
        LEFT JOIN follows ON follows.follower_id = $1 AND follows.following_id = posts.user_id
        LEFT JOIN saved_posts ON saved_posts.user_id = $1 AND saved_posts.post_id = posts.id
        ORDER BY posts.created_at DESC
      `, [userId]);

      // Pass everything to the EJS
      res.render("home_profile", {
        user: {
          ...req.user,
          followers,
          following
        },
        posts: postsResult.rows
      });

    } catch (err) {
      console.error(err);
      res.status(500).send("Error loading posts.");
    }
  } else {
    res.redirect("/login");
  }
});


app.post("/upload_post", cloudinaryUpload.single("post_image"), async (req, res) => {
  const imageUrl = req.file.path;
  const caption = req.body.caption;
  const userId = req.user.id;

  try {
    await db.query(
      "INSERT INTO posts (user_id, image_url, caption) VALUES ($1, $2, $3)",
      [userId, imageUrl, caption]
    );
    res.redirect("/home_profile");
  } catch (err) {
    console.error("Post upload error:", err);
    res.status(500).send("Error uploading post.");
  }
});




app.post("/apply/:id", upload.single("resume"), async (req, res) => {
  const jobId = req.params.id;
  const userId = req.user.id;
  const resumePath = req.file.path;

  await db.query(
    "INSERT INTO job_applications (user_id, job_id, resume_path) VALUES ($1, $2, $3)",
    [userId, jobId, resumePath]
  );

  res.redirect("/jobs");
});



app.post("/user_profile/edit", async (req, res) => {
    const {
        full_name, username, mobile, bio,
        instagram, linkedin, leetcode,
        gfg, codechef, gender
    } = req.body;

    try {
        await db.query(
            `UPDATE users SET full_name = $1, username = $2, mobile = $3, bio = $4,
            instagram = $5, linkedin = $6, leetcode = $7,
            gfg = $8, codechef = $9, gender = $10
            WHERE id = $11`,
            [
                full_name, username, mobile, bio,
                instagram, linkedin, leetcode,
                gfg, codechef, gender, req.user.id
            ]
        );
        res.redirect("/user_profile");
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).send("Error updating profile.");
    }
});

app.post("/register", async (req, res) => {
    const email = req.body.username;
    const namepart = email.split("@")[0];
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    const name = `${namepart}${randomNumber}`;
    const password = req.body.password;
    const con_password = req.body.confirm_password;

    if (password !== con_password) {
        return res.render("register", {
            confirmError: "Passwords do not match."
        });
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
        return res.render("register", {
            passwordError: "Password must be 8+ characters, include uppercase, lowercase, number, and special symbol."
        });
    }

    try {
        const emailCheck = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (emailCheck.rows.length > 0) {
            return res.render("register", {
                emailError: "Email already exists."
            });
        }

        const hashed_password = await bcrypt.hash(password, salt_rounds);
        await db.query(
            "INSERT INTO users(email, password, name) VALUES ($1, $2, $3)",
            [email, hashed_password, name]
        );

        res.redirect("/login");
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).render("register", {
            error: "An error occurred during registration. Please try again."
        });
    }
});

app.post("/login",
    passport.authenticate("local", {
        failureRedirect: "/login"
    }),
    (req, res) => {
        res.redirect("/home_profile");
    }
);

app.post('/like/:postId', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const userId = req.user.id;
    const postId = req.params.postId;

    try {
        // Check if already liked
        const alreadyLiked = await db.query(
            'SELECT * FROM likes WHERE user_id = $1 AND post_id = $2',
            [userId, postId]
        );

        if (alreadyLiked.rows.length === 0) {
            // Like it
            await db.query(
                'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)',
                [userId, postId]
            );

            await db.query(
                'UPDATE posts SET like_count = like_count + 1 WHERE id = $1',
                [postId]
            );

            res.json({ success: true, liked: true });
        } else {
            // Unlike it
            await db.query(
                'DELETE FROM likes WHERE user_id = $1 AND post_id = $2',
                [userId, postId]
            );

            await db.query(
                'UPDATE posts SET like_count = like_count - 1 WHERE id = $1',
                [postId]
            );

            res.json({ success: true, liked: false });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Comment routes
app.get('/comments/:postId', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const { postId } = req.params;
    try {
        const result = await db.query(
            `SELECT comments.id, comments.comment_text, comments.created_at, users.name, users.username 
             FROM comments 
             JOIN users ON comments.user_id = users.id 
             WHERE post_id = $1 ORDER BY comments.created_at DESC`, 
            [postId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.post('/comments', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const { postId, commentText } = req.body;
    const userId = req.user.id;
    
    try {
        await db.query(
            `INSERT INTO comments (post_id, user_id, comment_text) VALUES ($1, $2, $3)`, 
            [postId, userId, commentText]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// 1. Create follows table if not exists (run once at server start)
db.query(`CREATE TABLE IF NOT EXISTS follows (
    id SERIAL PRIMARY KEY,
    follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(follower_id, following_id)
);`).catch(console.error);

// 2. Add toggle-follow endpoint
app.post('/toggle-follow', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ status: 'error', message: 'Not authenticated' });
    }
    const followerId = req.user.id;
    const { followingId } = req.body;
    if (followerId === parseInt(followingId)) {
        return res.status(400).json({ status: 'error', message: 'Cannot follow yourself' });
    }
    try {
        const existingFollow = await db.query(
            'SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2',
            [followerId, followingId]
        );
        if (existingFollow.rows.length > 0) {
            // Unfollow
            await db.query(
                'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
                [followerId, followingId]
            );
            res.json({ status: 'unfollowed' });
        } else {
            // Follow
            await db.query(
                'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
                [followerId, followingId]
            );
            res.json({ status: 'followed' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// 1. Create saved_posts table if not exists (run once at server start)
db.query(`CREATE TABLE IF NOT EXISTS saved_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE(user_id, post_id)
);`).catch(console.error);

// 2. Add toggle-save endpoint
app.post('/toggle-save', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ status: 'error', message: 'Not authenticated' });
    }
    const userId = req.user.id;
    const { postId } = req.body;
    if (!userId || !postId) return res.status(400).json({ error: 'Missing user or post ID' });

    try {
        const existing = await db.query(
            'SELECT * FROM saved_posts WHERE user_id = $1 AND post_id = $2',
            [userId, postId]
        );
        if (existing.rows.length > 0) {
            // Unsave
            await db.query('DELETE FROM saved_posts WHERE user_id = $1 AND post_id = $2', [userId, postId]);
            res.json({ status: 'unsaved' });
        } else {
            // Save (ignore duplicates due to UNIQUE constraint)
            await db.query('INSERT INTO saved_posts (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, postId]);
            res.json({ status: 'saved' });
        }
    } catch (err) {
        console.error('Save error:', err);
        res.status(500).json({ error: 'Failed to toggle save' });
    }
});

// 4. Add /saved-posts route
app.get('/saved-posts', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    try {
        const saved = await db.query(`
            SELECT posts.*, users.name
            FROM saved_posts
            JOIN posts ON posts.id = saved_posts.post_id
            JOIN users ON users.id = posts.user_id
            WHERE saved_posts.user_id = $1
            ORDER BY saved_posts.id DESC
        `, [req.user.id]);
        // If AJAX, render partial; else, render full page
        if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
            res.render('partials/saved_posts_list', { savedPosts: saved.rows });
        } else {
            res.render('saved_posts', { savedPosts: saved.rows });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching saved posts');
    }
});

app.listen(port, () => {
    console.log("Server running on port", port);
});

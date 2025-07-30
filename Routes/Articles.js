const express = require('express')
const router = express.Router();
const {upload} = require('../Database/Imagekit');
const {authenticateToken , isAdmin} = require('../Middleware/AuthMiddleware');
const {getArticles , getArticle , updateArticle , deleteArticle , createArticle } = require('../Controller/ArticleController');
express.json()

router.get('/' , getArticles);
router.get('/:slug' , getArticle);
router.post('/new' , authenticateToken , upload.fields([{name : 'images' , maxCount : 100}]),createArticle );
router.patch('/update/:slug' , authenticateToken , upload.fields([{name : 'images' , maxCount : 100}]) ,  updateArticle);
router.delete('/delete/:slug', authenticateToken , deleteArticle);



module.exports = router;
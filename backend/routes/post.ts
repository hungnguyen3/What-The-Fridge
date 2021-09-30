import express from 'express';
const router = express.Router();
const Post = require('../models/Post');

router.get('/', (req: any, res: any) => {
	res.send('We are on post');
});

// create a post
router.post('/createPost', (req: any, res: any) => {
	// console.log(req.body)
	const post = new Post({
		title: req.body.title,
		description: req.body.description,
		body: req.body.body,
	});

	post
		.save()
		.then((data: any) => {
			res.json(data);
		})
		.catch((err: any) => {
			res.json({ message: err });
		});
});

// get a specific post by id
router.get('/getPost/:id', async (req: any, res: any) => {
	try {
		const post = await Post.findById(req.params.id);
		res.json(post);
	} catch (err: any) {
		res.json({ message: err });
	}
});

// delete a specific post by id
router.delete('/deletePost/:id', async (req: any, res: any) => {
	try {
		// deleteOne = remove
		const deletePost = await Post.deleteOne({ _id: req.params.id });
		res.json(deletePost);
	} catch (err: any) {
		res.json({ message: err });
	}
});

module.exports = router;

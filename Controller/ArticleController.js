const pool = require('../Database/db');
const {deleteImage , imagekit} = require('../Database/Imagekit');

exports.getArticle = async(req,res) => {
	const slug = req.params.slug;
	const client = await pool.connect();
	try
	{
			
			const article_data  = await client.query('SELECT a.log_id , a.title , a.slug , a.content FROM logbooks as a WHERE slug = $1' , [slug]);
			const article_images = await client.query('SELECT a.logbook_images_id , a.image_url , a.image_fileid FROM logbook_images as a WHERE a.log_id = $1' , [article_data.rows[0].log_id]);
			res.json([article_data.rows , article_images.rows]);
	}
	
	catch(e)
	{
		res.status(500).json({"error"  : `unable to retrieve the article! , error : ${e}`});
	}
	
	finally{
		client.release();
	}

	
	
}; 


function generate_slug(article_title){
	return article_title
	.trim()
	.toLowerCase()
	.replace(/[^\w\s-]/g, '')
	.replace(/\s+/g, '-');	
};

exports.getArticles = async(req,res) => {
	try
	{
		const client = await pool.connect();
		const article_data = await client.query('SELECT DISTINCT a.log_id , a.title , a.slug , p_a.image_url FROM logbooks as a DESCENT JOIN  logbook_images as p_a ON a.log_id  = p_a.log_id order by a.log_id ASC');
		res.json(article_data.rows);
		client.release();
	}
	
	catch(e)
	{
		res.status(500).json({"error" : `Error! noh baca pesen error-nya! : ${e}`});
	}
	
};

exports.deleteArticle  = async(req ,res, next) => {
	const client = await pool.connect();
	try
	{
		const slug = req.params.slug;
		
		
        client.query("BEGIN");
		const fileIDs = await client.query('SELECT p_a.image_fileid FROM logbook_images as p_a JOIN logbooks as a on a.log_id = p_a.log_id WHERE a.slug = $1', [slug]);
		
		await Promise.all(fileIDs.rows.map((item) => (deleteImage(item.image_fileid))));
		
		const result = await client.query('DELETE FROM logbooks WHERE slug = $1', [slug]);
		
        await client.query("COMMIT");
		
		if(result.rowCount){
			return res.status(200).json({"Message" : "Article successfully deleted"});
		}
		
		else{
			await client.query("ROLLBACK");
			return res.status(400).json({"message" : "Failed to delete article"});
		}
	}
	
	catch(e)
	{
        await pool.query("ROLLBACK");
		return res.status(500).json({"error":`unable to delete the article, error : ${e.message}`});
	}
	
	finally {
		client.release();
	}

};


exports.updateArticle = async(req,res,next) => {
	const client = await pool.connect();
	try
	{
		const oldslug = req.params.slug;
		
		const {title , content } = req.body;
		
		
		await client.query("BEGIN");

		
		const photo_url = req.file && req.file.path ? req.file.path : null;
		const photo_fileID = req.file && req.file.fileid ? req.file.fileid : null;
		const newslug  = generate_slug(title);
		
		
		
		const result  = await client.query('UPDATE logbooks SET  title = $1 , content = $2,  slug=$3 WHERE slug = $4' ,[title , content , newslug , oldslug]);
	
		if(result.rowCount){

			const logID_request = await client.query('SELECT log_id FROM logbooks WHERE slug = $1' , [newslug]);
			const logID = logID_request.rows[0].log_id;

			if (photo_url && photo_fileID) {
				const oldPhoto = await client.query(
					`SELECT m.image_fileid 
					 FROM logbook_images AS m
					 JOIN logbooks AS l ON m.log_id = l.log_id 
					 WHERE l.log_id = $1`,
					[logID]
				);

				if (oldPhoto.rowCount) {
					await deleteImage(oldPhoto.rows[0].image_fileid); // Delete old image
					await client.query("DELETE FROM logbook_images WHERE log_id = $1", [logID]); // Remove old photo reference
				}

				// Insert new photo
				await client.query(
					`INSERT INTO logbook_images (image_url, log_id, image_fileid) 
					 VALUES ($1, $2, $3)`,
					[photo_url, logID, photo_fileID]
				);
			}
			
					
			await client.query("COMMIT");
			return res.status(200).json({message : "Article successfully updated"});
			
		}
		
		else if (result.rowCount === 0 ){
			await client.query("COMMIT");
			return res.status(200).json({message : "Article successfully updated , no changes applied"});
			
		}



	}
	
	catch(e)
	{
		await client.query("ROLLBACK");
		console.error("Error in updateArticle:", e);
		return res.status(500).json({error : "Internal server error while updating the article."})
	}
	
	finally{client.release()}
		
};

exports.createArticle = async(req , res, next) => {
	
	const client = await pool.connect();
	try
	{
		var {title , content } = req.body;

		const image_files = req.files?.['images'] || [];
		console.log(image_files);
		

		const slug = generate_slug(title);
		const insertLogs = await client.query('INSERT INTO logbooks ( title , content , slug ) VALUES ($1,$2,$3) RETURNING log_id',[ title , content , slug ]);	
		
		if (insertLogs.rows.length){
			const logID = insertLogs.rows[0].log_id;
			
			if(image_files)
				
			{
				for (const item of image_files) {
				  await client.query(
					'INSERT INTO logbook_images (image_url , log_id , image_fileid) VALUES ($1,$2,$3)',
					[item.path, logID, item.fileid]
				  );
				}

				

			}
			
            await client.query("COMMIT");
			return res.status(201).json({"message" : `Data succesfully inserted !`});
		}
		
		else{
			await client.query("ROLLBACK");
			return res.status(400).json({"message" : "Failed to created a new article, please try again"});
		}
		
	}
	catch(e)
	{
	    await client.query("ROLLBACK");	
		return res.status(500).json({"error" : `unable to create a new article , error : ${e.message}`})
		
	}
	
	finally{
		client.release();
	}
	
	
	
};






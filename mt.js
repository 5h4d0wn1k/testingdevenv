
import { Request, Response } from "express";
import fs from "fs"
import files from "../../files.json" with {type: "json"};
import path from "path";
import { writeFile } from "fs/promises";
const uploadFiles = async (req:Request, res:Response) => {    
    const {id} = req.params
    console.log(id);

    // const dir = req.headers.parentDir
    console.log(req.headers)
    // console.log(req.file);
    // console.log(id.split("."));
    // const [name, extention] = id.split(".");

    const originalName= path.basename(id);
    const extention = path.extname(id);
    console.log(originalName, extention)

    const fileName = crypto.randomUUID();
    const writableFile = fs.createWriteStream(`./public/${fileName}${extention}`); 
    console.log(fileName);
         
    req.pipe(writableFile);


    req.on("end",async () => {
        fs.stat(`./public/${fileName}${extention}`,async (err, stats) => {
            files.push({
                "id": crypto.randomUUID(),
                "name": fileName,
                "originalName": originalName,
                "extention": extention,
                "parentId":"home",
                "owner": "me",
                "fileSize": stats.size
            })
            console.log(files);
            
            await writeFile("./files.json", JSON.stringify(files));        
        })
    
    res.status(201).json("file uploaded successsfully")
    })
}

export default uploadFiles;
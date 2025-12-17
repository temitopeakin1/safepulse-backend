import express, { Application } from "express";

export const app: Application = express();
const port: number = parseInt(process.env.PORT || '5000');

app.get("/", req: Request, res: Response) => {
    res.send("leggo, Server is up and running!");
}

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
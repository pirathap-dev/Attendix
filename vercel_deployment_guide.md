# Deploying Attendix to Vercel

To test QR scanning on a real device, you need the app to be accessible over the internet with HTTPS (which Vercel provides out of the box). Because Vercel is a serverless platform, it cannot use your local Docker PostgreSQL database. You will need to use a **hosted PostgreSQL database**.

Follow these step-by-step instructions to get your app live.

## Step 1: Set up a Hosted PostgreSQL Database

The easiest option when using Vercel is **Vercel Postgres**, but you can also use free tiers from **Neon** or **Supabase**.

### Using Neon (Recommended for easy setup)
1. Go to [Neon.tech](https://neon.tech/) and sign up for a free account.
2. Create a new project and database.
3. Once created, copy the **Connection String** (it will look like `postgresql://user:password@hostname/dbname?sslmode=require`).

## Step 2: Push your code to GitHub
Vercel deploys directly from your Git repository.
1. Go to [GitHub](https://github.com/) and create a new repository (e.g., `attendix`).
2. Open your terminal in your project folder (`c:\Users\pirat\OneDrive\Desktop\Temp\Project\Attendix`) and run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/attendix.git
   git push -u origin main
   ```

## Step 3: Create the Vercel Project
1. Go to [Vercel](https://vercel.com/) and sign up/log in with your GitHub account.
2. Click **Add New...** -> **Project**.
3. Import the `attendix` repository you just pushed to GitHub.

## Step 4: Configure Environment Variables in Vercel
Before clicking "Deploy", open the **Environment Variables** section and add the following keys:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `DATABASE_URL` | *Your hosted Postgres connection string from Step 1* | Make sure it includes `?sslmode=require` if using Neon. |
| `AUTH_SECRET` | *A random secure string* | You can generate one by running `npx auth secret` in your terminal, or just mash the keyboard. |
| `JWT_SECRET` | *Another random secure string* | |
| `NEXT_PUBLIC_APP_URL` | *Leave blank for now* | We will update this after Vercel gives us our deployment URL. |

## Step 5: Deploy
Click the **Deploy** button. Vercel will:
1. Install your dependencies.
2. Automatically run `prisma generate` (thanks to your `postinstall` script).
3. Build the Next.js app.

## Step 6: Push your Database Schema and Seed the Admin
Once the deployment finishes, your hosted database is still empty. We need to push the Prisma schema to it and create your admin account.

1. In your local terminal, temporarily change your `.env` file's `DATABASE_URL` to match your **hosted database connection string** (the one from Neon).
2. Run the following command to push the schema to the remote database:
   ```bash
   npx prisma db push
   ```
3. Run the following command to seed the Admin user:
   ```bash
   npm run db:seed
   ```
4. **Important**: Change your `.env` file's `DATABASE_URL` back to your local docker one so your local development doesn't break!

## Step 7: Update your App URL
1. Vercel will give you a public URL (e.g., `https://attendix-something.vercel.app`).
2. Go back to your Vercel Project Settings -> Environment Variables.
3. Add or update `NEXT_PUBLIC_APP_URL` to match your new Vercel domain (e.g., `https://attendix-something.vercel.app`).
4. **Redeploy** the app (Go to Deployments tab -> click the three dots on the top deployment -> Redeploy) so the app uses the new URL for the QR codes!

## Testing the QR Scanner
Now you can open the Vercel URL on your computer to view the generated QR code, and open the Vercel URL on your mobile phone's browser to log in and use the device's camera to scan it!

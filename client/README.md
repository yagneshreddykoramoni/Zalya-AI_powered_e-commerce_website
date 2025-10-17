# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/33652ef8-4218-4ce6-968b-2ecbc98d81ad

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/33652ef8-4218-4ce6-968b-2ecbc98d81ad) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Configuring UPI payments

The checkout flow now supports deep links to popular UPI apps and dynamic QR generation. Add the following variables to a `.env.local` file in the `client` folder (create it if it does not exist) and restart the dev server:

```env
VITE_BUSINESS_UPI_ID=yourmerchant@upi
VITE_BUSINESS_UPI_NAME=Your Shop Name
```

- `VITE_BUSINESS_UPI_ID` should be the virtual payment address you want customers to pay.
- `VITE_BUSINESS_UPI_NAME` is the display name shown inside UPI apps and on the QR confirmation sheet.

When these values are not set, the app falls back to `zalya@upi` and `Zalya`, so be sure to override them before going live.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/33652ef8-4218-4ce6-968b-2ecbc98d81ad) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

import { SignIn, SignUp } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function SignInPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md">
        <SignIn 
          routing="path" 
          path={`${basePath}/sign-in`} 
          signUpUrl={`${basePath}/sign-up`} 
          appearance={{
            elements: {
              rootBox: "w-full mx-auto",
              card: "bg-[#111217] border border-[#1F2228] shadow-xl w-full",
              headerTitle: "text-white",
              headerSubtitle: "text-zinc-400",
              socialButtonsBlockButton: "bg-white/5 border-white/10 hover:bg-white/10 text-white",
              socialButtonsBlockButtonText: "text-white font-medium",
              dividerLine: "bg-white/10",
              dividerText: "text-zinc-500",
              formFieldLabel: "text-zinc-300",
              formFieldInput: "bg-background border-white/10 text-white focus:border-purple-500 focus:ring-purple-500",
              formButtonPrimary: "bg-purple-600 hover:bg-purple-500 text-white",
              footerActionText: "text-zinc-400",
              footerActionLink: "text-purple-500 hover:text-purple-400",
            }
          }}
        />
      </div>
    </div>
  );
}

export function SignUpPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md">
        <SignUp 
          routing="path" 
          path={`${basePath}/sign-up`} 
          signInUrl={`${basePath}/sign-in`}
          appearance={{
            elements: {
              rootBox: "w-full mx-auto",
              card: "bg-[#111217] border border-[#1F2228] shadow-xl w-full",
              headerTitle: "text-white",
              headerSubtitle: "text-zinc-400",
              socialButtonsBlockButton: "bg-white/5 border-white/10 hover:bg-white/10 text-white",
              socialButtonsBlockButtonText: "text-white font-medium",
              dividerLine: "bg-white/10",
              dividerText: "text-zinc-500",
              formFieldLabel: "text-zinc-300",
              formFieldInput: "bg-background border-white/10 text-white focus:border-purple-500 focus:ring-purple-500",
              formButtonPrimary: "bg-purple-600 hover:bg-purple-500 text-white",
              footerActionText: "text-zinc-400",
              footerActionLink: "text-purple-500 hover:text-purple-400",
            }
          }}
        />
      </div>
    </div>
  );
}

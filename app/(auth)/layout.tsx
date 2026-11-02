import { GalleryVerticalEnd } from "lucide-react";

/** The centered column from shadcn's login-05 block, around every page a signed-out user can reach. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-8 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-6" aria-hidden="true" />
          </div>
          <span className="text-xl font-bold">lighting-quote</span>
        </div>
        {children}
      </div>
    </div>
  );
}

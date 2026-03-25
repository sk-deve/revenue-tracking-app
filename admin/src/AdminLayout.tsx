import { Outlet } from "react-router-dom";

export const AdminLayout = () => {
  return (
    <div className="flex min-h-screen">
      {/* ✅ Your sidebar */}
      {/* <Sidebar /> */}

      {/* ✅ Page content renders here */}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
};

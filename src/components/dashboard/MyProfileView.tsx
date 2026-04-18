import { ProfileContent } from './ProfileView';
import { Card, CardContent } from '../ui/card';

export function MyProfileView() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">My Profile</h2>
          <p className="text-slate-500 text-sm">Manage your account information and security</p>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto">
        <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[600px]">
              <ProfileContent />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

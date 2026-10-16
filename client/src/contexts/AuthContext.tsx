import { useEffect, useState, ReactNode, createContext, useContext, Dispatch, SetStateAction } from 'react';
import { LocalStorage } from '../utils';
import { setGlobalEntity, setglobalBranch } from '../utils/axios';
import { getBranchByEntity, requestHandler } from '../utils/api';

class userType {
  user_name: string = '';
  full_name: string = '';
  role_name: string = '';
  is_superadmin: 0 | 1 = 0;
  is_admin: 0 | 1 = 0;
  is_staff: 0 | 1 = 0;
  branch_id: number | null = null;
  entity_id: number | null = null;
  additional_info: 0 | 1 = 0;
  imageFile:string | null = null;
  s3_cloudfront_url: string | null = null;
  entityImage:string | null = null;
  twofa_enabled: 0 | 1 = 0;
  default_home_page: string | null = null;
}

interface AuthContextType {
  user: userType | null;
  signin: (user: userDetails, callback: VoidFunction) => void;
  signout: (callback: VoidFunction) => void;
  pageAccess: pageAccessType[];
  branchAccess: branchAccessType[];
  token: string;
  currentBranch: number | null;
  setcurrentBranch: Dispatch<SetStateAction<number | null>>;
  currentEntity: number | null;
  setccurrentEntity: Dispatch<SetStateAction<number | null>>;
  setUser: Dispatch<SetStateAction<userType | null>>;
  setpageAccess: Dispatch<SetStateAction<pageAccessType[]>>;
  setbranchAccess: Dispatch<SetStateAction<branchAccessType[]>>;
  settoken: Dispatch<SetStateAction<string>>;
}

class extraActionsType {
  action_id:number = 0;
  action_name:string ='';
  action_desc:string ='';

}

class pageAccessType {
  url: string = '';
  access_to_add: 0 | 1 = 0;
  access_to_update: 0 | 1 = 0;
  access_to_delete: 0 | 1 = 0;
  access_to_export: 0 | 1 = 0;
  extra_actions:extraActionsType[]=[]
}

class branchAccessType {
  branch_id: number | null = null;
  name: string = '';
  is_active?: 0 | 1;
  allow_yend_entry?: 'Y' | 'N';
}

export class userDetails {
  user: userType = new userType();
  pageAccess: pageAccessType[] = [];
  branchAccess: branchAccessType[] = [];
  token: string = '';
}

let AuthContext = createContext<AuthContextType>({
  user: new userType(),
  signin: () => { },
  signout: () => { },
  pageAccess: [],
  branchAccess: [],
  token: '',
  currentBranch: null,
  setcurrentBranch: () => { },
  currentEntity: null,
  setccurrentEntity: () => { },
  setUser: () => { },
  setpageAccess: () => { },
  setbranchAccess: () => { },
  settoken: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  let [user, setUser] = useState<userType | null>(null);
  let [pageAccess, setpageAccess] = useState<pageAccessType[]>([]);
  let [branchAccess, setbranchAccess] = useState<branchAccessType[]>([]);
  let [token, settoken] = useState<string>('');
  const [currentBranch, setcurrentBranch] = useState<number | null>(null)
  const [currentEntity, setccurrentEntity] = useState<number | null>(null)
  const [render, setrender] = useState(false)


  let signin = (userDetails: userDetails, callback: VoidFunction) => {
    if (!userDetails || !userDetails.user) return;
    setUser(userDetails.user);
    setpageAccess(userDetails.pageAccess || []);
    setbranchAccess(userDetails.branchAccess || []);
    settoken(userDetails.token || '');

    const defaultBranch = userDetails.user?.branch_id ?? null;
    const defaultEntity = userDetails.user?.entity_id ?? null;

    setcurrentBranch(defaultBranch);
    setccurrentEntity(defaultEntity);
    if (defaultEntity !== null) setGlobalEntity(defaultEntity);
    if (defaultBranch !== null) setglobalBranch(defaultBranch);

    LocalStorage.clear();
    localStorage.removeItem('currentEntity');
    localStorage.removeItem('currentBranch');
    if (defaultEntity !== null) localStorage.setItem('currentEntity', String(defaultEntity));
    if (defaultBranch !== null) localStorage.setItem('currentBranch', String(defaultBranch));

    LocalStorage.set('users', userDetails.user);
    LocalStorage.set('pageAccess', userDetails.pageAccess || []);
    LocalStorage.set('branchAccess', userDetails.branchAccess || []);
    localStorage.setItem('token', userDetails.token || '');

    callback();
  };

  const signout = (callback: VoidFunction) => {
    // console.log('signout');
    LocalStorage.clear();
    localStorage.removeItem('currentEntity');
    localStorage.removeItem('currentBranch');
    setGlobalEntity(null);
    setglobalBranch(null);
    setUser(null);
    setpageAccess([]);
    setbranchAccess([]);
    setcurrentBranch(null);
    setccurrentEntity(null);
    settoken('');
    callback();
  };

  useEffect(() => {
    if (LocalStorage.get('users') && LocalStorage.get('pageAccess') && LocalStorage.get('branchAccess') && localStorage.getItem('token')) {
      const u = LocalStorage.get('users');
      setUser(u);
      setpageAccess(LocalStorage.get('pageAccess'));
      setbranchAccess(LocalStorage.get('branchAccess'));
      settoken(localStorage.getItem('token') || '');

      const savedEntity = localStorage.getItem('currentEntity');
      const savedBranch = localStorage.getItem('currentBranch');

      const targetEntity = (savedEntity !== null && savedEntity !== 'undefined') ? Number(savedEntity) : (u?.entity_id ?? null);
      const targetBranch = (savedBranch !== null && savedBranch !== 'undefined') ? Number(savedBranch) : (u?.branch_id ?? null);

      setccurrentEntity(targetEntity);
      setcurrentBranch(targetBranch);
      if (targetEntity !== null) setGlobalEntity(targetEntity);
      if (targetBranch !== null) setglobalBranch(targetBranch);
    }
  }, []);

  useEffect(() => {
    setrender(false);
    setTimeout(() => {
      setrender(true);
    }, 1);
  }, [currentBranch, currentEntity]);

  useEffect(() => {
    setglobalBranch(currentBranch);
    if (currentBranch !== null && currentBranch !== undefined) {
      localStorage.setItem('currentBranch', String(currentBranch));
    }
  }, [currentBranch]);

  useEffect(() => {
    setGlobalEntity(currentEntity);
    if (currentEntity !== null && currentEntity !== undefined) {
      localStorage.setItem('currentEntity', String(currentEntity));
    }
  }, [currentEntity]);

  useEffect(() => {
    // Only superadmins can switch entities, so only they need to re-fetch the
    // entity's full branch list when the entity changes. For admins and staff,
    // the role-based branch access returned at login must not be overwritten
    // with every branch of the entity (e.g. a staff user would then see
    // branches they were never granted).
    if (user?.is_superadmin != 1) return;
    if (!currentEntity) return;
    requestHandler(
      async () => {
        return await getBranchByEntity();
      },
      (data) => {
        if (data.success && Array.isArray(data.data)) {
          setbranchAccess(data.data);
          const activeBranches = data.data.filter((b: any) => Number(b.is_active) === 1);
          const currentBranchValid = activeBranches.some((b: any) => Number(b.branch_id) === Number(currentBranch));
          if (!currentBranchValid && activeBranches.length > 0) {
            const newBranch = Number(activeBranches[0].branch_id);
            setcurrentBranch(newBranch);
            localStorage.setItem('currentBranch', String(newBranch));
            setglobalBranch(newBranch);
          }
        }
      },
      (errorMessage) => {
        console.log(errorMessage);
      }
    );
  }, [currentEntity, user?.is_superadmin]);

  // useEffect(() => {
  //   if(user == null){
  //     signout(()=>{navigate('/login')})
  //   }
  // },[user])


  let value = { user, signin, signout, pageAccess, branchAccess, token, currentBranch, setcurrentBranch, currentEntity, setccurrentEntity, setUser, setpageAccess, setbranchAccess, settoken };

  return (
    <AuthContext.Provider value={value}>{render && children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// const fakeAuthProvider = {
//     isAuthenticated: false,

//     login(callback: VoidFunction) {
//         fakeAuthProvider.isAuthenticated = true;
//         setTimeout(callback, 100); // fake async
//     },

//     signout(callback: VoidFunction) {
//         fakeAuthProvider.isAuthenticated = false;
//         setTimeout(callback, 100);
//     },
// };

// export { fakeAuthProvider };


// data
// .filter((roles) => role.role_name !== 'super Admin')
// .map(role)=>
//   { return <option value={role.role_id}>{role.role_name}</option> }

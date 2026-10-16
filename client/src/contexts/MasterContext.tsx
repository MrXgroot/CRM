import { useAuth } from './AuthContext';
import { useLocation } from 'react-router-dom';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { getAllBankName, getAllCitiesAPI, getAllCountriesAPI, getAllStatesAPI, getBankAccountType, GetPages, requestHandler } from '../utils/api';
import { syncOfflineRequests } from '../utils/offlineDB';
import { OfflineStatusNotifier } from '../utils/OfflineStatusNotifier';

interface countryType {
    COUNTRY_CODE: string;
    COUNTRY_NAME: string;
}
interface bankType {
    BANK_CODE:string;
    BANK_DESC:string;
    ORDER_SL:string;
}
interface bankAccountType {
    ACNT_TYPE:string;
    ACNT_DESC:string;
}
interface stateType {
    COUNTRY_CODE: string;
    STATE_CODE: string;
    STATE_NAME: string;
    TIN_CODE: string;
}
interface cityType {
    STATE_CODE: string;
    CITY_CODE: string;
    CITY_NAME: string;
}
interface pageType {
    page_id: number;
    page_name: string;
    name: string;
    description: string;
    superadmin_only: 0 | 1;
    access_for_all: 0 | 1;
    offline_enabled: 0 | 1;
    extra_actions: any[];
}

class MasterContextType {
    allCountries: countryType[] = [];
    allStates: stateType[] = [];
    allCities: cityType[] = [];
    bankName: bankType[]= [];
    bankAccType:bankAccountType[]= [];
    pages: pageType[] = [];
    getCountries: () => void = () => {};
    getStates: (country_code: string) => void = () => {};
    getCities: (state_code: string) => void = () => {};
    GetAllBankName: () => void = () =>{};
    GetBankAccountType: () => void = () =>{};
    getPages: () => void = () => {};
    isOfflineEnabled: (path: string) => boolean = () => false;

}

const MasterContext = createContext<MasterContextType>(
    new MasterContextType()
);

export function useMaster() {
    return useContext(MasterContext);
  }

export function MasterProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { pathname } = useLocation();
    const staffWorkspace = !!user && !pathname.startsWith("/portal") && !pathname.startsWith("/customer") && pathname !== "/login";
    const [allCountries, setallCountries] = useState<countryType[]>([]);
    const [allStates, setallStates] = useState<stateType[]>([]);
    const [allCities, setallCities] = useState<cityType[]>([]);
    const [bankName, setbankName] = useState<bankType[]>([]);
    const [bankAccType, setbankAccType] = useState<bankAccountType[]>([]);
    const [pages, setpages] = useState<pageType[]>([]);

    const getCountries = () => {
        requestHandler(
            async () => {
                return await getAllCountriesAPI();
            },
            (data) => {
                if (data.success) {
                    setallCountries(data.data);
                }
            },
            (errorMessage) => {
                console.log(errorMessage);
            }
        );
    };

    const getStates = (country_code : string) => {
        requestHandler(
            async () => {
                return await getAllStatesAPI(country_code);
            },
            (data) => {
                if (data.success) {
                    setallStates(data.data);
                }
            },
            (errorMessage) => {
                console.log(errorMessage);
            }
        );
    };

    const getCities = (state_code : string) => {
        requestHandler(
            async () => {
                return await getAllCitiesAPI(state_code);
            },
            (data) => {
                if (data.success) {
                    setallCities(data.data);
                }
            },
            (errorMessage) => {
                console.log(errorMessage);
            }
        );
    };
// bank master api's
    const GetAllBankName = () => {
        requestHandler(
            async () => {
                return await getAllBankName();
            },
            (data) => {
                if (data.success) {
                    setbankName(data.data);
                }
            },
            (errorMessage) => {
                console.log(errorMessage);
            }
        );

    }

    const GetBankAccountType = () => {
        requestHandler(
            async () => {
                return await getBankAccountType();
            },
            (data) => {
                if (data.success) {
                    setbankAccType(data.data);
                }
            },
            (errorMessage) => {
                console.log(errorMessage);
            }
        );

    }

    const getPages = () => {
        requestHandler(
            async () => {
                return await GetPages();
            },
            (data) => {
                if (data.success) {
                    setpages(data.data);
                }
            },
            (errorMessage) => {
                console.log(errorMessage);
            }
        );
    };

    const isOfflineEnabled = (path: string) => {
        return pages.find(p => p.page_name === path)?.offline_enabled == 1;
    };

    useEffect(() => {
        if (staffWorkspace) { getCountries(); getPages(); }
    }, [staffWorkspace])

    useEffect(() => {
        const handleOnline = () => {
            syncOfflineRequests();
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);


    useEffect(() => {
     if (staffWorkspace) { GetAllBankName(); GetBankAccountType(); }
    }, [staffWorkspace])
    
    

    const value : MasterContextType = {allCountries , allStates , allCities , bankName , bankAccType , pages , getCountries , getStates , getCities , GetAllBankName , GetBankAccountType , getPages , isOfflineEnabled};

    return (
        <MasterContext.Provider value={value}>
            {children}
            <OfflineStatusNotifier /> 
        </MasterContext.Provider>
    );
}


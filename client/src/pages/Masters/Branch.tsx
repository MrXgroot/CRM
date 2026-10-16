import { ChangeEvent, useEffect, useState } from "react";
import SelectField from "../../components/Select/Select";
import useTable from "../../components/Table/Table";
import Button, {
  ActionButtonGroup,
  AddButton,
  FilterButton,
  FilterResetButton,
} from "../../components/Button/Button";
import Modal from "../../components/Modal/Modal";
import { toastError, toastSuccess } from "../../utils/SweetAlert";
import {
  AddBranch,
  GetAllBranches,
  GetDataUsingPincode,
  GetEntity,
  UpdateBranch,
  getBranchByEntity,
  requestHandler,
} from "../../utils/api";
import { entityModel } from "./Entity";
import InputField from "../../components/Input/Input";
import { useMaster } from "../../contexts/MasterContext";
import { useAuth } from "../../contexts/AuthContext";
import { useForm } from "react-hook-form";
import { useFormField as useFieldAttributes } from "../../hooks/form";

class filterType{
  page:number = 0;
  limit:number =15;
  name:string  = '';
}

class extras {
  areas?: string[] = [];
}

export class branchModel extends extras {
  entity_id: number | null = null;
  branch_id: number | null = null;
  name: string | null = null;
  branch_incharge_name: string | null = null;
  address1: string | null = null;
  address2: string | null = null;
  pincode: number | null = null;
  country: string | null = null;
  state: string | null = null;
  city: string | null = null;
  area: string | null = null;
  allow_yend_entry: 'Y' | 'N' = 'N';
  is_active: 0 | 1 = 1;
}

const Branch = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<branchModel>();

  const [dataArray, setdataArray] = useState<branchModel[]>([]);
  const [dataArray1, setdataArray1] = useState<branchModel[]>([]);
  const [entityArray, setEntityArray] = useState<entityModel[]>([]);
  const [action, setaction] = useState<"Add" | "Edit" | "View" | "">("");
  // state used to handle modal open state
  const [modalOpen, setmodalOpen] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState('');

  const getFieldAttributes = useFieldAttributes({ register, errors });
  const country_watch = watch("country");
  const state_watch = watch("state");
  const AreasWatch = watch("areas");

  //========== FILTERS=========//
  const DefaultFilterValues = new filterType();
  const {
    register: filterRegister,
    handleSubmit: handleFilterSubmit,
    reset: filterReset,getValues
  } = useForm<filterType>({
    defaultValues: DefaultFilterValues,
  });
  const getFilterAttributes = useFieldAttributes({
    register: filterRegister,
    errors,
  });

  const { user } = useAuth();
  const { Table,page,setPage } = useTable(() => {getAllBranches()});
  const { allCountries, getStates, allStates, getCities, allCities, isOfflineEnabled } =
    useMaster();

  // function to get all entity
  function getAllBranches() {
    const filter=getValues()
    requestHandler(
      async () => {
        return await GetAllBranches({...filter,page:Number(page)});
      },
      (data) => {
        setdataArray(data.data);
      },
      (errorMessage) => {
        toastError.fire({
          title: errorMessage,
        });
      }
    );
  }

  function GetAllBranchByEntity() {
    return requestHandler(
      async () => {
        return await getBranchByEntity();
      },
      (data) => {
        setdataArray1(data.data);
      },
      (errorMessage) => {
        toastError.fire({
          title: errorMessage,
        });
      }
    );
  }

  // function to get all entity
  function getAllEntity() {
    return requestHandler(
      async () => {
        return await GetEntity();
      },
      (data) => {
        setEntityArray(data.data);
      },
      (errorMessage) => {
        toastError.fire({
          title: errorMessage,
        });
      }
    );
  }

  // custom Hook - handles form submission
  // we need to pass a callback function to "useOnSubmit" ,
  // that callback function will be called after validation of the form
  const onFormSubmit = (formData: branchModel) => {
    if (action == "Add") {
      requestHandler(
        async () => {
          return await AddBranch(formData);
        },
        (data) => {
          if (data.success) {
            toastSuccess.fire({
              title: data.message,
            });
            getAllBranches();
            setmodalOpen(false);
          }
        },
        (errorMessage) => {
          toastError.fire({
            title: errorMessage,
          });
        },
        isOfflineEnabled('/branch')
      );
    } else if (action == "Edit") {
      requestHandler(
        () => {
          return UpdateBranch(formData);
        },
        (data) => {
          toastSuccess.fire({
            title: data.message,
          });
          getAllBranches();
          setmodalOpen(false);
        },
        (errorMessage) => {
          toastError.fire({
            title: errorMessage,
          });
        },
        isOfflineEnabled('/branch')
      );
    }
  };

  const handleGetDataUsingPincodeOnchange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pincode = e.target.value;
    reset((prevData: branchModel) => ({
      ...prevData,
      pincode: Number(pincode),
    }));
    if (pincode.length !== 6) {
      setPincodeStatus('');
      setPincodeLoading(false);
    }

    if (pincode.length == 6) {
      setPincodeLoading(true);
      setPincodeStatus('');
      requestHandler(
        async () => {
          return await GetDataUsingPincode(Number(pincode));
        },
        (data) => {
          setPincodeLoading(false);
          if (!data.data || data.data.length == 0){
            reset((prev: branchModel) => ({
              ...prev,
              country: "",
              state: "",
              city: "",
              area: "",
              areas: [],
            }));
            setPincodeStatus('No details found for pincode');
            return;
          }
          const { city_code, state_code, country_code, district, state_name } = data.data[0];
          const areas = data.data.map((item: any) => item.area).filter(Boolean);

          if (country_code) getStates(country_code);
          if (state_code) getCities(state_code);
          setPincodeStatus(`✓ ${district || state_name || 'Location loaded'}`);
          setTimeout(() => {
            reset((prev) => ({
              ...prev,
              country: country_code || prev.country,
              state: state_code || prev.state,
              city: city_code || prev.city,
              areas: areas,
              area: areas[0] || prev.area,
            }));
          }, 400);
          
        },
        (errorMessage) => {
          setPincodeLoading(false);
          setPincodeStatus('Invalid pincode');
          toastError.fire({
            title: errorMessage,
          });
        }
      );
    }
  };

  // function to empty the "data" state
  function resetDatastate() {
    reset(new branchModel());
  }

  // function to pass to the modal close button
  // this closes the modal and clears the "data" state
  function modalClose() {
    setmodalOpen(false);
    resetDatastate();
  }

  function resetFilterStates() {
    filterReset(new filterType());
    getAllBranches();
  }

  const onFilterFormSubmit = (formData: filterType) => {
    setPage(0)
    requestHandler(
      async () => {
        return await GetAllBranches({...formData,page:Number(page)});
      },
      (data) => {
        setdataArray(data.data);
      },
      (errorMessage) => {
        toastError.fire({
          title: errorMessage,
        });
      }
    );
  };

  useEffect(() => {
  getAllBranches()
  }, [page]);
  

  useEffect(() => {
    getAllBranches();
    getAllEntity();
    GetAllBranchByEntity();
  }, []);

  useEffect(() => {
    if (action == "Edit" || action == "View") {
      if (country_watch) {
        getStates(country_watch); // Load states based on the selected country
      }
      if (state_watch) {
        getCities(state_watch); // Load cities based on the selected state
      }
    }
  }, [action, country_watch, state_watch]);


  return (
    <div>
      {/* template header */}
      <div className="mx-3 my-3 shadow px-4 py-1 border rounded ">
        {/* ===== Head ===== */}
        <div className="flex items-center justify-between flex-wrap">
          <div>
            <h2 className="text-2xl font-medium text-cyan-950 pl-2 mt-3 lg:mt-0 py-5">
              Branch 
            </h2>
          </div>
          <div className="flex justify-start lg:justify-end flex-wrap">
            <AddButton
              onClick={() => {
                setaction("Add");
                if (user?.is_admin == 1) {
                  reset({ ...new branchModel(), entity_id: user?.entity_id });
                } else {
                  resetDatastate();
                }
                setmodalOpen(true);
              }}
            >
              Add Branch
            </AddButton>
          </div>
        </div>
        <hr className ="my-3 border-gray-300 " />
        <form
          noValidate
          onSubmit={handleFilterSubmit(onFilterFormSubmit)}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-5 items-end">
            <InputField
              {...getFilterAttributes('name',{
                onChange:(e:ChangeEvent<HTMLInputElement>)=>{
                  filterReset((prev) => ({ ...prev, name: e.target.value }));
                }
              })}
              name="name"
              label="Search by branch name"
            />
            <InputField
              {...getFilterAttributes('limit',{
                onChange:(e:ChangeEvent<HTMLInputElement>)=>{
                  filterReset((prev) => ({ ...prev, limit: Number(e.target.value) }));
                }
              })}
              label="Page limit"
              name="limit"
              type="number"
              placeholder="Limit"
              min={0}
            />
            <div className="flex ">
                <FilterResetButton
                    type="button"
                    onClick={() => {
                        resetFilterStates();
                        setPage(0);
                    }}
                ></FilterResetButton>
                <FilterButton onClick={() => {}}></FilterButton>
            </div>
          </div>
        </form>
      </div>
      {/* ===== Table ===== */}
      <Table pagination>
        <thead>
          <tr>
            <td>Sl</td>
            <th>Branch name</th>
            <th>Entity name</th>
            <th>Is active</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {(user?.is_admin == 1 ? dataArray1 : dataArray).map((_, index) => {
            const {limit}=getValues();
            return (
              <tr key={index}>
                <td>{(page * limit)+(index + 1)}</td>
                <td title={String(_.branch_id)}><b>{_.name}</b></td>
                <td title={String(_.entity_id)}>
                  {
                    entityArray.filter((ea) => ea.entity_id == _.entity_id)[0]
                      ?.name
                  }
                </td>
                <td>
                  {_.is_active == 1 ? (
                    <span className="inline-flex items-center justify-center rounded-full bg-green-300 px-2.5 py-0.5 text-black-700">
                      <p className="whitespace-nowrap text-sm">Yes</p>
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center rounded-full bg-orange-300 px-2.5 py-0.5 text-black-700">
                      <p className="whitespace-nowrap text-sm">No</p>
                    </span>
                  )}
                </td>
                {/* <td>{countryName}{cityName}</td> */}
                <td width={"15%"}>
                  <ActionButtonGroup
                    onView={() => {
                      setaction("View");
                      reset({
                        ..._,
                        areas: _.area ? [_.area] : [],
                      });
                      if (_.country) getStates(_.country);
                      if (_.state) getCities(_.state);
                      setmodalOpen(true);
                    }}
                    onEdit={() => {
                      setaction("Edit");
                      reset({
                        ..._,
                        areas: _.area ? [_.area] : [],
                      });
                      if (_.country) getStates(_.country);
                      if (_.state) getCities(_.state);
                      setmodalOpen(true);
                    }}
                    view
                    edit
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {/* Modal for Add , Edit and View */}
      {modalOpen && (
        <Modal heading={`${action} Branch`} onClose={modalClose}>
          <form noValidate onSubmit={handleSubmit(onFormSubmit)}>
            <fieldset disabled={action === "View"}>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
              {user?.is_admin != 1 && (
                <SelectField {...getFieldAttributes('entity_id')} required label="Entity" disabled={action != 'Add'}>
                  <option value="">Select entity</option>
                  {(user?.is_superadmin != 1 ? entityArray.filter(_=>Number(_.entity_id) == user?.entity_id) : entityArray).map(entity =>{
                      if(entity.entity_id){
                        return <option key={entity.entity_id} value={entity.entity_id}>{entity.name}</option>
                      }
                    }
                   )
                  }
                </SelectField>
              )}
                <InputField
                  label="Branch name"
                  {...getFieldAttributes("name", {
                    required: "Branch name is required",
                  })}
                />
                
                <InputField
                  label="Branch incharge name"
                  {...getFieldAttributes("branch_incharge_name")}
                />

                <InputField
                  label="Address 1"
                  {...getFieldAttributes("address1", {
                    required: "Address 1 is required",
                  })}
                />

                <InputField
                  label="Address 2"
                  {...getFieldAttributes("address2")}
                />

                <div className="relative">
                  <InputField
                    placeholder="Eg:576217"
                    label="Pincode"
                    {...getFieldAttributes("pincode", {
                      required: "Pincode is required",
                      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                        handleGetDataUsingPincodeOnchange(e);
                      }
                    })}
                  />
                  {pincodeLoading && (
                    <p className="absolute top-0 right-2 text-[11px] font-medium text-violet-600 z-10 whitespace-nowrap">
                      Fetching location...
                    </p>
                  )}
                  {pincodeStatus && (
                    <p className="absolute top-0 right-2 text-[11px] font-medium text-green-600 z-10 whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px] text-right" title={pincodeStatus}>
                      {pincodeStatus}
                    </p>
                  )}
                </div>

                <SelectField
                  label="Country"
                  {...getFieldAttributes("country", {
                    required: "Country is required",
                    onChange: (e: ChangeEvent<HTMLInputElement>) => {
                      reset((prev) => ({
                        ...prev,
                        country: e.target.value,
                        state: "",
                        city: "",
                      }));
                      getStates(e.currentTarget.value);
                    },
                  })}
                >
                  <option value="">Select country</option>
                  {allCountries.map((_) => (
                    <option key={_.COUNTRY_CODE} value={_.COUNTRY_CODE}>
                      {_.COUNTRY_NAME}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="State"
                  {...getFieldAttributes("state", {
                    required: "State is required",
                    onChange: (e: ChangeEvent<HTMLInputElement>) => {
                      reset((prev) => ({
                        ...prev,
                        state: e.target.value,
                        city: "",
                      }));
                      getCities(e.currentTarget.value);
                    },
                  })}
                >
                  <option value="">Select state</option>
                  {allStates.map((_) => (
                    <option key={_.STATE_CODE} value={_.STATE_CODE}>
                      {_.STATE_NAME}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  {...getFieldAttributes("city", {
                    required: "City is required",
                  })}
                  required
                  label="City"
                >
                  <option value="">Select city</option>
                  {allCities.map((_) => (
                    <option key={_.CITY_CODE} value={_.CITY_CODE}>
                      {_.CITY_NAME}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="Area"
                  {...getFieldAttributes("area", {
                    required: "Area is required",
                    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                      reset((prev) => ({ ...prev, area: e.target.value }));
                    },
                  })}
                >
                  <option value="">Select Area</option>
                  {AreasWatch &&
                    AreasWatch.map((area: string, index: number) => (
                      <option key={index} value={area}>
                        {area}
                      </option>
                    ))
                  }
                </SelectField>

                <SelectField
                  {...getFieldAttributes("allow_yend_entry")}
                  required
                  label="Allow year end entry"
                >
                  <option value="Y">Yes</option>
                  <option value="N">No</option>
                </SelectField>

                {(action == "Edit" || action == "View") && (
                  <SelectField
                    {...getFieldAttributes("is_active")}
                    required
                    label="Is active"
                  >
                    <option value="">Select</option>
                    <option value="1">Yes</option>
                    <option value="0">No</option>
                  </SelectField>
                )}
              </div>
            </fieldset>
            <hr className="mt-4 border-gray-300 " />
            <div className="flex justify-end">
              <Button onClick={modalClose} varient="light" type="button">
                Cancel
              </Button>
              <Button varient="blue">Submit</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Branch;


import { ChangeEvent, useEffect, useState } from "react";
import InputField from "../../components/Input/Input";
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
  addDesignation,
  getDesignations,
  requestHandler,
  updateDesignation,
} from "../../utils/api";
import SelectField from "../../components/Select/Select";
import { useForm } from "react-hook-form";
import { useFormField as useFieldAttributes } from "../../hooks/form";
import { useMaster } from "../../contexts/MasterContext";
import { SYNC_COMPLETE_EVENT } from '../../utils/offlineDB';

export class dsignationModel {
  entity_id: number | null = null;
  desig_id: number | null = null;
  name: string | null = null;
  is_active: 0 | 1 = 1;
}

class filterType {
  page: number = 0;
  limit: number = 15;
  name: string = "";
}

const Designation = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<dsignationModel>();
  const [dataArray, setdataArray] = useState<dsignationModel[]>([]);
  const [action, setaction] = useState<"Add" | "Edit" | "View" | "">("");
  const [modalOpen, setmodalOpen] = useState(false);
  const getFieldAttributes = useFieldAttributes({ register, errors });
  const { Table, page, setPage } = useTable(() => {
    getAllDesignations();
  });
    const {  isOfflineEnabled } =useMaster();

  // FOR FILTERS
  const DefaultFilterValues = new filterType();
  const {
    register: filterRegister,
    handleSubmit: handleFilterSubmit,
    reset: filterReset,
    getValues,
  } = useForm<filterType>({
    defaultValues: DefaultFilterValues,
  });
  const getFilterAttributes = useFieldAttributes({
    register: filterRegister,
    errors,
  });
 const requestConfigData = {
        method: 'GET',
        url: '/designation', // Assuming the base URL is known
    };
  // function to get all entity
  function getAllDesignations() {
    const filter = getValues();
    requestHandler(
      async () => {
        return await getDesignations({ ...filter, page: Number(page) });
      },
      (data) => {
        setdataArray(data.data);
      },
      (errorMessage) => {
        toastError.fire({
          title: errorMessage,
        });
      },
      isOfflineEnabled('/designation'),
      requestConfigData
    );
  }

  const onFormSubmit = (formData: dsignationModel) => {
    if (action == "Add") {
      requestHandler(
        async () => {
          return await addDesignation(formData);
        },
        (data) => {
          if (data.success) {
            toastSuccess.fire({
              title: data.message,
            });
            getAllDesignations();
            setmodalOpen(false);
          }
        },
        (errorMessage) => {
          toastError.fire({
            title: errorMessage,
          });
        },
        isOfflineEnabled("/designation"),
      { method: "POST", url: "/designation", data: formData}, 
      );
    } else if (action == "Edit") {
      requestHandler(
        () => {
          return updateDesignation(formData);
        },
        (data) => {
          toastSuccess.fire({
            title: data.message,
          });
          getAllDesignations();
          setmodalOpen(false);
        },
        (errorMessage) => {
          toastError.fire({
            title: errorMessage,
          });
        },
        isOfflineEnabled("/designation"),
      { method: "PUT", url: "/designation", data: formData}, 
      );
    }
  };

  const onFilterFormSubmit = (formData: filterType) => {
    requestHandler(
      async () => {
        return await getDesignations({ ...formData, page: 0 });
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
  function resetFilterStates() {
    filterReset(new filterType());
    getAllDesignations();
  }

  function resetDatastate() {
    reset(new dsignationModel());
  }

  function modalClose() {
    setmodalOpen(false);
    resetDatastate();
  }
  useEffect(() => {
    const handleSyncComplete = () => {
        getAllDesignations(); // Re-fetch the data for this specific page
    };
    
    window.addEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete);

    return () => {
        window.removeEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete);
    };
}, [getAllDesignations]);

  useEffect(() => {
    getAllDesignations();
  }, [page]);

  return (
    <div>
      <div className="mx-3 my-3 shadow px-4 py-1 border rounded ">
        <div className="flex items-center justify-between flex-wrap">
          <div>
            <h2 className="text-2xl font-medium text-cyan-950 pl-2 mt-3 lg:mt-0 py-5">
              Designation
            </h2>
          </div>
          <div className="flex justify-start lg:justify-end flex-wrap">
            <AddButton
              onClick={() => {
                setaction("Add");
                resetDatastate();
                setmodalOpen(true);
              }}
            >
              Add Designation
            </AddButton>
          </div>
        </div>
        <hr className="my-3 border-gray-300 " />
        {/* filter */}
        <form noValidate onSubmit={handleFilterSubmit(onFilterFormSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-5 items-end">
            <InputField
              {...getFilterAttributes("name", {
                onChange: (e: ChangeEvent<HTMLInputElement>) => {
                  filterReset((prev) => ({ ...prev, name: e.target.value }));
                },
              })}
              name="name"
              label="Search by designation"
            />
            <InputField
              {...getFilterAttributes("limit", {
                onChange: (e: ChangeEvent<HTMLInputElement>) => {
                  filterReset((prev) => ({
                    ...prev,
                    limit: Number(e.target.value),
                  }));
                },
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
            <th>Sl</th>
            <th>Designation name</th>
            <th>Is active</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {dataArray && dataArray.map((_, index) => {
            const { limit } = getValues();
            return (
              <tr key={index}>
                <td>{page * limit + (index + 1)}</td>
                <td title={_.desig_id?.toString()}><b>{_.name}</b></td>
                <td>
                  {" "}
                  {_.is_active ? (
                    <span className="inline-flex items-center justify-center rounded-full bg-green-300 px-2.5 py-0.5 text-black-700">
                      <p className="whitespace-nowrap text-sm">Yes</p>
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center rounded-full bg-orange-300 px-2.5 py-0.5 text-black-700">
                      <p className="whitespace-nowrap text-sm">No</p>
                    </span>
                  )}
                </td>
                <td width={"15%"}>
                  <ActionButtonGroup
                    onView={() => {
                      setaction("View");
                      reset(_);
                      setmodalOpen(true);
                    }}
                    onEdit={() => {
                      setaction("Edit");
                      reset(_);
                      setmodalOpen(true);
                    }}
                    view
                    edit
                    // deletee
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {/* Modal for Add , Edit and View */}
      {modalOpen && (
        <Modal heading={`${action} Designation`} onClose={modalClose}>
          <form noValidate onSubmit={handleSubmit(onFormSubmit)}>
            <fieldset disabled={action === "View"}>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
                <InputField
                  label="Designation name"
                  placeholder="Eg. Security Officer"
                  {...getFieldAttributes("name", {
                    required: "Designation name is required",
                  })}
                />
                {(action === "Edit" || action == "View") && (
                  <SelectField
                    {...getFieldAttributes("is_active")}
                    required
                    label="Is active"
                  >
                    <option value="0">No</option>
                    <option value="1">Yes</option>
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

export default Designation;

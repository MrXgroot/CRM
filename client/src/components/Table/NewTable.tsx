import { useEffect, useRef } from "react"
import './Table.css'

interface TableProps {
    children: any;
    className?: string;
    width?: number | string;
    pagination?: boolean;
    page?: number,
    setPage?: React.Dispatch<React.SetStateAction<number>>,
    refresh?: () => void,
    pageLimit?: number,
    setPageLimit?: React.Dispatch<React.SetStateAction<number>>
}

const NewTable: React.FC<TableProps> = ({ children, className, pagination, page, setPage, refresh, pageLimit, setPageLimit }) => {
    const isFirstRender = useRef(true);
    const PagesArray = Array.from({ length: 10 }, (_, i) => i + 1); // [1,2,...,10]

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return; // Skip the first render
        }

        if (Number(page) >= 0) {
            if (refresh) refresh();
        } else {
            if (setPage) setPage(0);
        }
    }, [page]);

    return (
        <div className={`TableComp shadow border border-gray-200 mx-3 ${className}`}>
            <div className="new_table_wrapper overflow-x-auto">
                <table className="min-w-full text-sm bg-white divide-y-2 divide-gray-200">
                    {children}
                </table>
            </div>
            {
                pagination &&
                <div className="flex justify-end px-4 py-2 border-t border-gray-200 rounded-b-lg  overflow-x-scroll  md:overflow-x-hidden">
                    <input
                        className="border-gray-300 border rounded mr-1 w-[80px] px-2"
                        type="number"
                        value={pageLimit}
                        onChange={(e) => {
                            if (setPageLimit) {
                                setPageLimit(Number(e.target.value));
                            }
                        }}
                        onBlur={() => {
                            if (refresh)
                                refresh();
                        }}
                    />
                    <ol className="flex justify-end gap-1 text-xs font-medium">
                        <li>
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault()
                                    if (setPage)
                                        setPage((curr) => Math.max(0, curr - 1));
                                }}
                                className="inline-flex items-center justify-center text-gray-900 bg-white border border-gray-300 rounded size-8 rtl:rotate-180"
                            >
                                <span className="sr-only">Prev Page</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-3 h-3"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </a>
                        </li>

                        <li className="block md:hidden ">
                            <a
                                href="#"
                                className="block leading-8 text-center text-gray-900 bg-white border border-gray-300 rounded size-8"
                            >
                                {page !== undefined ? page + 1 : 1}
                            </a>
                        </li>

                        {
                            PagesArray.map((pageNum: number) => {
                                return (
                                    <li className="hidden md:block" key={pageNum}>
                                        <a
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (setPage) {
                                                    setPage(pageNum - 1); // send zero-based
                                                }
                                            }}
                                            href="#"
                                            className={`block leading-8 text-center text-gray-900 bg-white border border-gray-300 rounded size-8 ${page === pageNum - 1 ? 'border-gray-600 font-semibold' : ''}`}
                                        >
                                            {pageNum}
                                        </a>
                                    </li>
                                )
                            })
                        }
                        {
                            !!page && (page > 9) &&
                            <>
                                <li className="hidden md:block">
                                    <a
                                        href="#"
                                        className={`block leading-8 text-center text-gray-900 bg-white border border-gray-300 rounded size-8`}
                                    >
                                        ...
                                    </a>
                                </li>
                                <li className="hidden md:block">
                                    <a
                                        href="#"
                                        className={`block leading-8 text-center text-gray-900 bg-white border rounded size-8 border-gray-600 font-semibold`}
                                    >
                                        {page + 1}
                                    </a>
                                </li>
                            </>
                        }

                        <li>
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault()
                                    if (setPage)
                                        setPage((curr) => curr + 1);
                                }}
                                className="inline-flex items-center justify-center text-gray-900 bg-white border border-gray-300 rounded size-8 rtl:rotate-180"
                            >
                                <span className="sr-only">Next Page</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-3 h-3"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </a>
                        </li>
                    </ol>
                </div>
            }
        </div>
    );
}

export default NewTable;

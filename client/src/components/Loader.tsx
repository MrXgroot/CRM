const Loader = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center w-screen h-screen bg-transparent backdrop-blur-sm backdrop-brightness-[95%]">
            <div className="flex gap-2">
                <div className="w-5 h-5 rounded-full animate-pulse bg-violet-600"></div>
                <div className="w-5 h-5 rounded-full animate-pulse bg-violet-600"></div>
                <div className="w-5 h-5 rounded-full animate-pulse bg-violet-600"></div>
            </div>
        </div>
    );
};

export default Loader;


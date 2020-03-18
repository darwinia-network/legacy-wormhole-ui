function anchors() {
    const {hash} = window.location;
    if (hash !== '') {
        setTimeout(
            () => {
                const id = hash.replace('#', '');
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView();
                }
            },
            0
        );
    }
}

export default anchors;

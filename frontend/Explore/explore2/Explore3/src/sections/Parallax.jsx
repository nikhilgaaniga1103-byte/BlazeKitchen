import React from "react";
import Banner from "../assets/images/banner.avif";

const Parallax = () => {
  return (
    <section className="inner-container h-screen py-20">
      <div
        className="h-full rounded-xl bg-fixed bg-center bg-cover"
        style={{
          backgroundImage: `url(${Banner})`,
        }}
      />
    </section>
  );
};

export default Parallax;

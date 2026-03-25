import React from 'react'
import Header from '../../components/Header/Header'
import Hero from '../../components/HomeComp/Hero/Hero'
import Problem from '../../components/HomeComp/Problem/Problem'
import HowItWorks from '../../components/HomeComp/HowItWorks/HowItWorks'
import Pricing from '../../components/HomeComp/Pricing/Pricing'
import FinalCTA from '../../components/HomeComp/FinalCTA/FinalCTA'
import Footer from '../../components/Footer/Footer'

const Home = () => {
  return (
    <div>
         <Header />
         <Hero />
         <Problem />
         <HowItWorks />
         <Pricing />
         <FinalCTA />
         <Footer />
    </div>
  )
}

export default Home